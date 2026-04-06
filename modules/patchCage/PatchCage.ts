/**
 * NURBS Patch Cage with explicit shared topology.
 *
 * Watertightness is enforced by object identity:
 * - CageVertex instances are shared between patches
 * - CageEdge instances are shared between patches
 * - No synchronization, no copying, no duplication
 * - If two patches share a boundary, they literally reference the same CageVertex objects
 */

import {Vec3} from './patchCageTypes';
import {vadd, vsub, vscale, vlerp, vnormalize, vdist, vcross} from './vec3Math';

// =========================================================================
// Topology primitives — shared by identity
// =========================================================================

export class CageVertex {
  position: Vec3;
  constructor(x: number, y: number, z: number) {
    this.position = [x, y, z];
  }
  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
  }
}

/**
 * A cage edge: 4 CageVertex references forming a cubic Bézier curve.
 * Shared between adjacent patches.
 */
export class CageEdge {
  v0: CageVertex;  // start (on surface)
  v1: CageVertex;  // handle near start
  v2: CageVertex;  // handle near end
  v3: CageVertex;  // end (on surface)

  constructor(v0: CageVertex, v1: CageVertex, v2: CageVertex, v3: CageVertex) {
    this.v0 = v0; this.v1 = v1; this.v2 = v2; this.v3 = v3;
  }

  eval(t: number): Vec3 {
    const mt = 1 - t;
    const p0 = this.v0.position, p1 = this.v1.position, p2 = this.v2.position, p3 = this.v3.position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }

  /** Get the 4 vertices as an array */
  vertices(): [CageVertex, CageVertex, CageVertex, CageVertex] {
    return [this.v0, this.v1, this.v2, this.v3];
  }

  /** Get reversed (same vertices, reversed order) */
  reversed(): [CageVertex, CageVertex, CageVertex, CageVertex] {
    return [this.v3, this.v2, this.v1, this.v0];
  }
}

/**
 * A patch face: references a 4×4 grid of CageVertex instances.
 * Boundary vertices are shared with adjacent patches via CageEdge.
 */
export class NurbsPatch {
  /** 4×4 grid of CageVertex. grid[row][col], row=V direction, col=U direction */
  grid: CageVertex[][];
  /** 4×4 weights (1.0 = Bézier, other = rational NURBS) */
  weights: number[][];
  rational: boolean;

  constructor(grid: CageVertex[][], weights?: number[][]) {
    this.grid = grid;
    this.weights = weights || [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]];
    this.rational = !!weights;
  }

  eval(u: number, v: number): Vec3 {
    const bu = bernstein3(u), bv = bernstein3(v);
    if (this.rational) {
      let wx = 0, wy = 0, wz = 0, wsum = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const w = bu[i] * bv[j] * this.weights[j][i];
        const p = this.grid[j][i].position;
        wx += w * p[0]; wy += w * p[1]; wz += w * p[2]; wsum += w;
      }
      return wsum > 0 ? [wx/wsum, wy/wsum, wz/wsum] : [0,0,0];
    }
    const r: Vec3 = [0,0,0];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const w = bu[i] * bv[j];
      const p = this.grid[j][i].position;
      r[0] += w*p[0]; r[1] += w*p[1]; r[2] += w*p[2];
    }
    return r;
  }

  normal(u: number, v: number): Vec3 {
    const eps = 1e-5;
    const du = vsub(this.eval(Math.min(1,u+eps), v), this.eval(Math.max(0,u-eps), v));
    const dv = vsub(this.eval(u, Math.min(1,v+eps)), this.eval(u, Math.max(0,v-eps)));
    return vnormalize(vcross(du, dv));
  }

  /** Get edge as array of 4 CageVertex. side: 0=bottom, 1=right, 2=top, 3=left */
  getEdgeVertices(side: number): [CageVertex, CageVertex, CageVertex, CageVertex] {
    const g = this.grid;
    switch (side) {
      case 0: return [g[0][0], g[0][1], g[0][2], g[0][3]];
      case 1: return [g[0][3], g[1][3], g[2][3], g[3][3]];
      case 2: return [g[3][0], g[3][1], g[3][2], g[3][3]];
      case 3: return [g[0][0], g[1][0], g[2][0], g[3][0]];
      default: return [g[0][0], g[0][1], g[0][2], g[0][3]];
    }
  }
}

// =========================================================================
// Patch Cage — the container
// =========================================================================

export class PatchCage {
  patches: NurbsPatch[] = [];

  /** Move a vertex — all patches sharing it update automatically */
  moveVertex(v: CageVertex, x: number, y: number, z: number): void {
    v.set(x, y, z);
  }

  /** Get all unique CageVertex instances across all patches */
  allVertices(): CageVertex[] {
    const seen = new Set<CageVertex>();
    for (const p of this.patches) {
      for (const row of p.grid) {
        for (const v of row) seen.add(v);
      }
    }
    return Array.from(seen);
  }

  /**
   * Find which patches share an edge with a given patch.
   * Returns {side, otherPatch, otherSide, reversed} for each shared edge.
   */
  findAdjacentPatches(patchIdx: number): {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] {
    const patch = this.patches[patchIdx];
    const result: {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] = [];

    for (let side = 0; side < 4; side++) {
      const edge = patch.getEdgeVertices(side);
      // Find another patch that shares these 4 vertices on one of its sides
      for (let oi = 0; oi < this.patches.length; oi++) {
        if (oi === patchIdx) continue;
        const other = this.patches[oi];
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeVertices(os);
          // Check forward match
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: false});
          }
          // Check reversed match
          if (edge[0] === otherEdge[3] && edge[1] === otherEdge[2] &&
              edge[2] === otherEdge[1] && edge[3] === otherEdge[0]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: true});
          }
        }
      }
    }
    return result;
  }

  /**
   * Split along an isoline, propagating across ALL connected patches.
   *
   * Splitting patch P in U at t creates a new column cutting through P.
   * This new column intersects the top (side 2) and bottom (side 0) edges.
   * Any patch sharing those edges must also be split at the corresponding point.
   * This propagation continues until wrapping around or hitting a boundary.
   *
   * @param patchIdx Starting patch index
   * @param direction 'u' or 'v'
   * @param t Parameter value (0..1)
   */
  splitIsoline(patchIdx: number, direction: 'u' | 'v', t: number): void {
    const toSplit: {idx: number, dir: 'u' | 'v', t: number}[] = [];
    const visited = new Set<number>();

    const queue: {idx: number, dir: 'u' | 'v', t: number}[] = [{idx: patchIdx, dir: direction, t}];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur.idx)) continue;
      visited.add(cur.idx);
      toSplit.push(cur);

      // Splitting in U creates a cut across side 0 (bottom) and side 2 (top).
      // Splitting in V creates a cut across side 3 (left) and side 1 (right).
      // Patches sharing those cut edges need to be split too.
      const cutSides = cur.dir === 'u' ? [0, 2] : [3, 1];

      const adj = this.findAdjacentPatches(cur.idx);
      for (const a of adj) {
        if (visited.has(a.otherIdx)) continue;
        if (!cutSides.includes(a.side)) continue;

        // Determine split direction and parameter in the neighbor.
        // The cut enters the neighbor through otherSide.
        // If otherSide is 0 or 2 (horizontal), the cut continues in U direction.
        // If otherSide is 1 or 3 (vertical), the cut continues in V direction.
        const otherIsHorizontal = a.otherSide === 0 || a.otherSide === 2;
        const adjDir: 'u' | 'v' = otherIsHorizontal ? 'u' : 'v';
        const adjT = a.reversed ? (1 - cur.t) : cur.t;

        queue.push({idx: a.otherIdx, dir: adjDir, t: adjT});
      }
    }

    // Pre-compute split vertices for each cut edge so they're shared.
    // A cut edge is where the isoline crosses a patch boundary.
    // Two adjacent patches that both get split share the SAME new vertex on their shared edge.

    // For each patch being split, compute the 4 new midpoint CageVertex on its cut edges.
    // Key: use the SAME CageVertex when two patches share a cut edge.

    // Map: shared edge vertex pair → new split CageVertex
    // When the isoline crosses an edge (4 CageVertex), the split point is at parameter t on that edge.
    // Two patches sharing that edge need the SAME split vertex.
    const edgeSplitVertexMap = new Map<CageVertex, CageVertex>();

    function getOrCreateSplitVertex(edgeStart: CageVertex, edgeEnd: CageVertex, t: number): CageVertex {
      // The split vertex is on the edge from edgeStart to edgeEnd.
      // Use edgeStart as key (both patches see the same edgeStart for forward-matched edges).
      // For reversed edges, the other patch sees edgeEnd as its start — handle both.
      let key = edgeStart;
      if (edgeSplitVertexMap.has(key)) return edgeSplitVertexMap.get(key)!;
      key = edgeEnd;
      if (edgeSplitVertexMap.has(key)) return edgeSplitVertexMap.get(key)!;

      const p = vlerp(edgeStart.position, edgeEnd.position, t);
      const v = new CageVertex(p[0], p[1], p[2]);
      edgeSplitVertexMap.set(edgeStart, v);
      edgeSplitVertexMap.set(edgeEnd, v);
      return v;
    }

    // Split in reverse index order so splice doesn't invalidate earlier indices
    toSplit.sort((a, b) => b.idx - a.idx);
    for (const s of toSplit) {
      this.splitSinglePatchShared(s.idx, s.dir, s.t, getOrCreateSplitVertex);
    }
  }

  /**
   * Split a single patch using shared vertex factory for cut-edge vertices.
   */
  private splitSinglePatchShared(
    patchIdx: number, direction: 'u' | 'v', t: number,
    getSharedVertex: (a: CageVertex, b: CageVertex, t: number) => CageVertex
  ): void {
    const patch = this.patches[patchIdx];
    const g = patch.grid;

    if (direction === 'u') {
      const leftGrid: CageVertex[][] = [];
      const rightGrid: CageVertex[][] = [];

      for (let row = 0; row < 4; row++) {
        const {left, mid, right} = splitBezierRow(g[row][0], g[row][1], g[row][2], g[row][3], t);

        // For boundary rows (0 and 3), the mid vertex is on a shared edge.
        // Use the shared vertex factory so adjacent patches get the SAME vertex.
        let midV: CageVertex;
        if (row === 0 || row === 3) {
          midV = getSharedVertex(g[row][0], g[row][3], t);
        } else {
          // Interior row: new vertex, not shared
          midV = new CageVertex(mid[0], mid[1], mid[2]);
        }

        leftGrid.push([g[row][0], left[0], left[1], midV]);
        rightGrid.push([midV, right[0], right[1], g[row][3]]);
      }

      this.patches.splice(patchIdx, 1,
        new NurbsPatch(leftGrid, cloneWeights(patch.weights)),
        new NurbsPatch(rightGrid, cloneWeights(patch.weights))
      );
    } else {
      const bottomGrid: CageVertex[][] = [[], [], [], []];
      const topGrid: CageVertex[][] = [[], [], [], []];

      for (let col = 0; col < 4; col++) {
        const {left, mid, right} = splitBezierRow(g[0][col], g[1][col], g[2][col], g[3][col], t);

        // For boundary columns (0 and 3), the mid vertex is on a shared edge.
        let midV: CageVertex;
        if (col === 0 || col === 3) {
          midV = getSharedVertex(g[0][col], g[3][col], t);
        } else {
          midV = new CageVertex(mid[0], mid[1], mid[2]);
        }

        bottomGrid[0][col] = g[0][col];
        bottomGrid[1][col] = left[0];
        bottomGrid[2][col] = left[1];
        bottomGrid[3][col] = midV;

        topGrid[0][col] = midV;
        topGrid[1][col] = right[0];
        topGrid[2][col] = right[1];
        topGrid[3][col] = g[3][col];
      }

      this.patches.splice(patchIdx, 1,
        new NurbsPatch(bottomGrid, cloneWeights(patch.weights)),
        new NurbsPatch(topGrid, cloneWeights(patch.weights))
      );
    }
  }

  // =========================================================================
  // Tessellation
  // =========================================================================

  tessellatePatch(patchIdx: number, resolution: number = 8): {
    positions: number[], normals: number[], indices: number[]
  } {
    const patch = this.patches[patchIdx];
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    const n = resolution;

    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const p = patch.eval(i/n, j/n);
      const nm = patch.normal(i/n, j/n);
      positions.push(p[0], p[1], p[2]);
      normals.push(nm[0], nm[1], nm[2]);
    }

    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j*(n+1)+i, b = a+1, c = a+(n+1), d = c+1;
      indices.push(a, b, d, a, d, c);
    }

    return {positions, normals, indices};
  }

  tessellateAll(resolution: number = 8): {
    vertices: Float32Array, normals: Float32Array, indices: Uint32Array,
    patchTriRanges: [number, number][]
  } {
    const allPos: number[] = [], allNorm: number[] = [], allIdx: number[] = [];
    const ranges: [number, number][] = [];
    let vOff = 0, tIdx = 0;

    for (let pi = 0; pi < this.patches.length; pi++) {
      const t = this.tessellatePatch(pi, resolution);
      const start = tIdx;
      for (const v of t.positions) allPos.push(v);
      for (const v of t.normals) allNorm.push(v);
      for (const i of t.indices) allIdx.push(i + vOff);
      vOff += t.positions.length / 3;
      tIdx += t.indices.length / 3;
      ranges.push([start, tIdx]);
    }

    return {
      vertices: new Float32Array(allPos), normals: new Float32Array(allNorm),
      indices: new Uint32Array(allIdx), patchTriRanges: ranges,
    };
  }
}

// =========================================================================
// Helpers
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt*mt*mt, 3*mt*mt*t, 3*mt*t*t, t*t*t];
}

/**
 * De Casteljau split of 4 cubic Bézier control points at parameter t.
 * Returns: left half (2 interior CageVertex), midpoint Vec3, right half (2 interior CageVertex).
 * The original endpoints are reused (shared by identity).
 */
function splitBezierRow(p0: CageVertex, p1: CageVertex, p2: CageVertex, p3: CageVertex, t: number): {
  left: [CageVertex, CageVertex],
  mid: Vec3,
  right: [CageVertex, CageVertex]
} {
  const a = vlerp(p0.position, p1.position, t);
  const b = vlerp(p1.position, p2.position, t);
  const c = vlerp(p2.position, p3.position, t);
  const d = vlerp(a, b, t);
  const e = vlerp(b, c, t);
  const mid = vlerp(d, e, t);

  return {
    left: [new CageVertex(a[0], a[1], a[2]), new CageVertex(d[0], d[1], d[2])],
    mid,
    right: [new CageVertex(e[0], e[1], e[2]), new CageVertex(c[0], c[1], c[2])],
  };
}

function cloneWeights(w: number[][]): number[][] {
  return w.map(row => [...row]);
}

// =========================================================================
// Builder helpers for primitives
// =========================================================================

/**
 * Create a 4×4 CageVertex grid. Interior vertices are new instances.
 * Boundary vertices can be supplied to share with adjacent patches.
 */
export function makeGrid(
  corners: [CageVertex, CageVertex, CageVertex, CageVertex], // [c00, c10, c01, c11]
  edges?: {
    bottom?: [CageVertex, CageVertex, CageVertex, CageVertex], // row 0: c00, ?, ?, c10
    right?: [CageVertex, CageVertex, CageVertex, CageVertex],  // col 3: c10, ?, ?, c11
    top?: [CageVertex, CageVertex, CageVertex, CageVertex],    // row 3: c01, ?, ?, c11
    left?: [CageVertex, CageVertex, CageVertex, CageVertex],   // col 0: c00, ?, ?, c01
  }
): CageVertex[][] {
  const [c00, c10, c01, c11] = corners;
  const grid: CageVertex[][] = [[], [], [], []];

  // Corners
  grid[0][0] = c00; grid[0][3] = c10;
  grid[3][0] = c01; grid[3][3] = c11;

  // Bottom edge (row 0)
  if (edges?.bottom) {
    grid[0][1] = edges.bottom[1];
    grid[0][2] = edges.bottom[2];
  } else {
    grid[0][1] = lerpVert(c00, c10, 1/3);
    grid[0][2] = lerpVert(c00, c10, 2/3);
  }

  // Top edge (row 3)
  if (edges?.top) {
    grid[3][1] = edges.top[1];
    grid[3][2] = edges.top[2];
  } else {
    grid[3][1] = lerpVert(c01, c11, 1/3);
    grid[3][2] = lerpVert(c01, c11, 2/3);
  }

  // Left edge (col 0)
  if (edges?.left) {
    grid[1][0] = edges.left[1];
    grid[2][0] = edges.left[2];
  } else {
    grid[1][0] = lerpVert(c00, c01, 1/3);
    grid[2][0] = lerpVert(c00, c01, 2/3);
  }

  // Right edge (col 3)
  if (edges?.right) {
    grid[1][3] = edges.right[1];
    grid[2][3] = edges.right[2];
  } else {
    grid[1][3] = lerpVert(c10, c11, 1/3);
    grid[2][3] = lerpVert(c10, c11, 2/3);
  }

  // Interior: 4 vertices via bilinear interpolation
  for (let row = 1; row <= 2; row++) {
    const v = row / 3;
    for (let col = 1; col <= 2; col++) {
      if (grid[row][col]) continue; // already set by edge
      const u = col / 3;
      const p = vadd(
        vadd(vscale(c00.position, (1-u)*(1-v)), vscale(c10.position, u*(1-v))),
        vadd(vscale(c01.position, (1-u)*v), vscale(c11.position, u*v))
      );
      grid[row][col] = new CageVertex(p[0], p[1], p[2]);
    }
  }

  return grid;
}

function lerpVert(a: CageVertex, b: CageVertex, t: number): CageVertex {
  const p = vlerp(a.position, b.position, t);
  return new CageVertex(p[0], p[1], p[2]);
}
