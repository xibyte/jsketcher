/**
 * Build the full tessellation graph for one NurbsSurface.
 *
 * Produces:
 *   - Interior TessPoints at grid (r/n, c/n) for r,c ∈ [1, n-1]
 *   - BorderTessPoints on each of the 4 sides (length n+1 in the surface's
 *     own edge direction), deduped at corners so each surface corner is a
 *     single BorderTessPoint shared by the two adjacent side arrays.
 *   - 2 × n × n Triangles, each owning 3 TessEdge references. Each quad
 *     cell is split along its bottom-left → top-right diagonal so every
 *     face in the graph is a triangle — this keeps adaptive subdivision
 *     trivial (split one edge → two smaller triangles, no quad re-wiring).
 *   - TessEdges: interior horizontal / vertical / diagonal edges owned by
 *     this surface; edges along a BoundingCurve looked up (or created) on
 *     `curve.tessellation!.edges[segmentIdx]` so two surfaces sharing a
 *     curve share the SAME TessEdge instance — splitting it later
 *     propagates to the triangles of both surfaces in one operation.
 *
 * Everything is watertight via shared CurveTessPoints: two surfaces on a
 * shared curve see the SAME xyz array at every boundary sample because
 * their BorderTessPoints forward `xyz` to the same CurveTessPoint.
 * Normals stay per-surface (BorderTessPoint carries its own `normal`)
 * so creases at non-smooth joins are preserved.
 */
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from '../models/BoundingCurve/BoundingCurve.entity';
import {
  TessPoint, BorderTessPoint, TessEdge, Triangle,
  type AnyTessPoint, type CurveTessPoint, type Vec2,
} from './types';

export interface SurfaceTessellation {
  /** The resolution this tessellation was built at. */
  resolution: number;
  /** Interior sample points (not including the 4 sides or corners). */
  interior: TessPoint[];
  /** Per-side border point arrays [0=bottom, 1=right, 2=top, 3=left], length n+1 in the surface's own edge direction. */
  borders: BorderTessPoint[][];
  /**
   * Full (n+1)×(n+1) grid of point references in row-major order.
   * `pointGrid[r][c]` is the sample at uv = (c/n, r/n); boundary entries
   * are BorderTessPoints, interior entries are TessPoints.
   */
  pointGrid: AnyTessPoint[][];
  /** 2 × n × n triangles (each quad cell split along its diagonal). */
  triangles: Triangle[];
  /** Every TessEdge this surface contributed to (including cross-surface shared edges). */
  edges: TessEdge[];
}

/**
 * Refresh an existing SurfaceTessellation's xyz / normal values in place.
 *
 * Keeps every allocated instance — TessPoints, BorderTessPoints, Triangles,
 * TessEdges, curve CurveTessPoints and perSurface BorderTessPoint arrays
 * — so a drag frame mutates numbers instead of reallocating graph nodes.
 * Corner CurveTessPoints auto-track via Vertex.position references; the
 * only writes that happen here are:
 *   1. interior curve-sample xyz (via tessellateCurve's in-place path)
 *   2. each BorderTessPoint's normal (xyz still flows from its curvePoint)
 *   3. each interior TessPoint's xyz + normal
 *
 * O(n²) numeric writes per surface, zero object allocations.
 */
export function refreshSurfaceTessellation(
  surface: NurbsSurface,
  graph: SurfaceTessellation,
  resolution: number,
): void {
  const n = resolution;

  const sideCurves: BoundingCurve[] = [
    surface.boundingCurves.bottom,
    surface.boundingCurves.right,
    surface.boundingCurves.top,
    surface.boundingCurves.left,
  ];

  // Curves are assumed to be already tessellated by the caller
  // (NurbsSurface.tessellate ensures them via BoundingCurve.ensureTessellated).

  // 1. Refresh border normals for THIS surface. xyz values are already
  //    up to date because they forward to the shared CurveTessPoints.
  for (let side = 0; side < 4; side++) {
    const arr = graph.borders[side];
    for (let i = 0; i < arr.length; i++) {
      const bp = arr[i];
      const nm = surface.normal(bp.uv[0], bp.uv[1]);
      bp.normal[0] = nm[0];
      bp.normal[1] = nm[1];
      bp.normal[2] = nm[2];
    }
  }

  // 3. Refresh interior TessPoints in place.
  for (let i = 0; i < graph.interior.length; i++) {
    const tp = graph.interior[i];
    const u = tp.uv[0], v = tp.uv[1];
    const p = surface.eval(u, v);
    tp.xyz[0] = p[0];
    tp.xyz[1] = p[1];
    tp.xyz[2] = p[2];
    const nm = surface.normal(u, v);
    tp.normal[0] = nm[0];
    tp.normal[1] = nm[1];
    tp.normal[2] = nm[2];
  }
}

export function tessellateSurface(surface: NurbsSurface, resolution: number): SurfaceTessellation {
  const n = resolution;

  // Curves are assumed to be already tessellated by the caller
  // (NurbsSurface.tessellate ensures them via BoundingCurve.ensureTessellated).

  const sideCurves: BoundingCurve[] = [
    surface.boundingCurves.bottom,
    surface.boundingCurves.right,
    surface.boundingCurves.top,
    surface.boundingCurves.left,
  ];

  // -----------------------------------------------------------------------
  // 1. Detect per-side reversal. A BoundingCurve's intrinsic direction is
  //    whichever direction its `cp` list is ordered in. Another surface
  //    sharing the curve on one of its own sides may walk it in reverse.
  // -----------------------------------------------------------------------
  const rev: boolean[] = [
    shouldReverse(surface, 0, sideCurves[0]),
    shouldReverse(surface, 1, sideCurves[1]),
    shouldReverse(surface, 2, sideCurves[2]),
    shouldReverse(surface, 3, sideCurves[3]),
  ];

  const curveSampleAt = (side: number, kInSurface: number): CurveTessPoint => {
    const samples = sideCurves[side].tessellation!.samples;
    return rev[side] ? samples[n - kInSurface] : samples[kInSurface];
  };
  const segmentIdxOf = (kInSurface: number, reversed: boolean): number =>
    reversed ? (n - 1 - kInSurface) : kInSurface;

  // -----------------------------------------------------------------------
  // 3. Build per-side BorderTessPoints with corner deduplication.
  //    Corner numbering (by uv):
  //       0 = (0, 0)   between bottom[0]       and left[0]
  //       1 = (1, 0)   between bottom[n]       and right[0]
  //       2 = (1, 1)   between right[n]        and top[n]
  //       3 = (0, 1)   between top[0]          and left[n]
  // -----------------------------------------------------------------------
  const makeBTP = (uv: Vec2, curvePoint: CurveTessPoint): BorderTessPoint => {
    const nm = surface.normal(uv[0], uv[1]);
    return new BorderTessPoint([uv[0], uv[1]], [nm[0], nm[1], nm[2]], curvePoint);
  };

  const corner0 = makeBTP([0, 0], curveSampleAt(0, 0));
  const corner1 = makeBTP([1, 0], curveSampleAt(0, n));
  const corner2 = makeBTP([1, 1], curveSampleAt(1, n));
  const corner3 = makeBTP([0, 1], curveSampleAt(3, n));

  const buildSide = (
    side: number,
    startCorner: BorderTessPoint,
    endCorner: BorderTessPoint,
    uvAt: (t: number) => Vec2,
  ): BorderTessPoint[] => {
    const arr: BorderTessPoint[] = new Array(n + 1);
    arr[0] = startCorner;
    arr[n] = endCorner;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      arr[k] = makeBTP(uvAt(t), curveSampleAt(side, k));
    }
    return arr;
  };

  const borders: BorderTessPoint[][] = [
    buildSide(0, corner0, corner1, (t) => [t, 0]),     // bottom
    buildSide(1, corner1, corner2, (t) => [1, t]),     // right
    buildSide(2, corner3, corner2, (t) => [t, 1]),     // top  (u=0→1 at v=1)
    buildSide(3, corner0, corner3, (t) => [0, t]),     // left
  ];

  for (let side = 0; side < 4; side++) {
    sideCurves[side].tessellation!.perSurface.set(surface, borders[side]);
  }

  // -----------------------------------------------------------------------
  // 4. Interior TessPoints + full (n+1)×(n+1) grid of point references.
  //    pointGrid[r][c] is the sample at uv = (c/n, r/n).
  // -----------------------------------------------------------------------
  const interior: TessPoint[] = [];
  const pointGrid: AnyTessPoint[][] = new Array(n + 1);
  for (let r = 0; r <= n; r++) pointGrid[r] = new Array(n + 1);

  // Boundary rows/cols from border arrays
  for (let c = 0; c <= n; c++) pointGrid[0][c] = borders[0][c];    // bottom row
  for (let c = 0; c <= n; c++) pointGrid[n][c] = borders[2][c];    // top row
  for (let r = 1; r < n; r++)  pointGrid[r][0] = borders[3][r];    // left col (skip corners)
  for (let r = 1; r < n; r++)  pointGrid[r][n] = borders[1][r];    // right col

  // Interior
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      const u = c / n, v = r / n;
      const p = surface.eval(u, v);
      const nm = surface.normal(u, v);
      const tp = new TessPoint([u, v], [p[0], p[1], p[2]], [nm[0], nm[1], nm[2]]);
      interior.push(tp);
      pointGrid[r][c] = tp;
    }
  }

  // -----------------------------------------------------------------------
  // 5. Build TessEdges (deduped within this surface by the per-cell index
  //    grids, and across surfaces by curve.tessellation!.edges[segmentIdx] for boundary
  //    edges).
  //    - hEdges[r][c] connects pointGrid[r][c]   ↔ pointGrid[r][c+1]
  //    - vEdges[r][c] connects pointGrid[r][c]   ↔ pointGrid[r+1][c]
  // -----------------------------------------------------------------------
  const hEdges: TessEdge[][] = new Array(n + 1);
  for (let r = 0; r <= n; r++) hEdges[r] = new Array(n);
  const vEdges: TessEdge[][] = new Array(n);
  for (let r = 0; r < n; r++) vEdges[r] = new Array(n + 1);

  const allEdges: TessEdge[] = [];

  const getOrCreateBoundaryEdge = (
    curve: BoundingCurve, segIdx: number, a: AnyTessPoint, b: AnyTessPoint,
  ): TessEdge => {
    const existing = curve.tessellation!.edges[segIdx];
    if (existing) {
      existing.endpoints.set(surface, [a, b] as const);
      return existing;
    }
    const e = new TessEdge();
    e.endpoints.set(surface, [a, b] as const);
    curve.tessellation!.edges[segIdx] = e;
    return e;
  };

  const makeInteriorEdge = (a: AnyTessPoint, b: AnyTessPoint): TessEdge => {
    const e = new TessEdge();
    e.endpoints.set(surface, [a, b] as const);
    return e;
  };

  // Horizontal edges
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c < n; c++) {
      const a = pointGrid[r][c], b = pointGrid[r][c + 1];
      let e: TessEdge;
      if (r === 0) {
        e = getOrCreateBoundaryEdge(sideCurves[0], segmentIdxOf(c, rev[0]), a, b);
      } else if (r === n) {
        e = getOrCreateBoundaryEdge(sideCurves[2], segmentIdxOf(c, rev[2]), a, b);
      } else {
        e = makeInteriorEdge(a, b);
      }
      hEdges[r][c] = e;
      allEdges.push(e);
    }
  }

  // Vertical edges
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n; c++) {
      const a = pointGrid[r][c], b = pointGrid[r + 1][c];
      let e: TessEdge;
      if (c === 0) {
        e = getOrCreateBoundaryEdge(sideCurves[3], segmentIdxOf(r, rev[3]), a, b);
      } else if (c === n) {
        e = getOrCreateBoundaryEdge(sideCurves[1], segmentIdxOf(r, rev[1]), a, b);
      } else {
        e = makeInteriorEdge(a, b);
      }
      vEdges[r][c] = e;
      allEdges.push(e);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Triangles — two per quad cell, split along the bottom-left →
  //    top-right diagonal. The diagonal is a fresh interior TessEdge
  //    shared by the two triangles of the same cell.
  //
  //    For cell (r, c) with corners
  //        a = pointGrid[r    ][c    ]   (bottom-left)
  //        b = pointGrid[r    ][c + 1]   (bottom-right)
  //        d = pointGrid[r + 1][c + 1]   (top-right)
  //        e = pointGrid[r + 1][c    ]   (top-left)
  //    the split is along a↔d.
  //
  //    Lower-right triangle (a, b, d), CCW edges: a↔b, b↔d, d↔a.
  //    Upper-left triangle  (a, d, e), CCW edges: a↔d, d↔e, e↔a.
  // -----------------------------------------------------------------------
  const triangles: Triangle[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const a = pointGrid[r][c];
      const d = pointGrid[r + 1][c + 1];
      const diag = new TessEdge();
      diag.endpoints.set(surface, [a, d] as const);
      allEdges.push(diag);

      const lower = new Triangle(surface);
      lower.edges.push(hEdges[r][c]);       // a ↔ b
      lower.edges.push(vEdges[r][c + 1]);   // b ↔ d
      lower.edges.push(diag);               // d ↔ a
      for (const e of lower.edges) e.triangles.push(lower);
      triangles.push(lower);

      const upper = new Triangle(surface);
      upper.edges.push(diag);               // a ↔ d
      upper.edges.push(hEdges[r + 1][c]);   // d ↔ e (undirected)
      upper.edges.push(vEdges[r][c]);       // e ↔ a
      for (const e of upper.edges) e.triangles.push(upper);
      triangles.push(upper);
    }
  }

  return {resolution: n, interior, borders, pointGrid, triangles, edges: allEdges};
}

// =========================================================================
// Helpers
// =========================================================================

function shouldReverse(surface: NurbsSurface, side: number, curve: BoundingCurve): boolean {
  // A BoundingCurve's intrinsic direction is set by the order of its `cp`
  // list (established when the curve was first created). Grid cells are
  // ControlPoints (which extend Vertex), so comparing by identity works
  // directly — no `.vertex` indirection needed.
  const myStart = surface.getEdgeVertices(side)[0];
  return myStart !== curve.cp[0];
}
