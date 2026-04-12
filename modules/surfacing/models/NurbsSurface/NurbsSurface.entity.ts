import type {Vec3} from 'math/vec';
import {normalize, sub, cross} from 'math/vec';
import {GeometricEntity} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';
import {Cage} from '../Cage/Cage.entity';
import {Line} from '../Line/Line.entity';
import type {SurfaceSet} from '../../SurfaceSet';
import type {SurfacingEditor} from '../../SurfacingEditor';
import {
  tessellateSurface,
  type SurfaceTessellation,
} from '../../tessellation/tessellateSurface';
import {NurbsSurfaceObject3D} from './NurbsSurface.object3d';
import {
  SURFACE_BASE_COLOR,
} from '../../three';

export interface MirrorConstraintData {
  source: NurbsSurface;
  planePoint: Vec3;
  planeNormal: Vec3;
  cpPairs: {source: ControlPoint, mirror: ControlPoint}[];
}

/**
 * A single bicubic NURBS surface patch with a 4×4 grid of ControlPoints.
 *
 * `ControlPoint extends Vertex`, so a grid cell is both a CP (has weight)
 * and a Vertex (has position, handle, usedBy back-reference). Adjacent
 * surfaces share grid entries by identity — shared boundaries are
 * watertight and weights along a shared edge are automatically in
 * agreement because they're literally the same CP instance.
 *
 * Derived:
 *   - boundingCurves     (4 BoundingCurve entities, share CP instances)
 *   - cage               (Cage visualization entity)
 */
export class NurbsSurface extends GeometricEntity<NurbsSurfaceObject3D> {

  /** 4×4 grid of ControlPoints (source of truth, mutable, shared across surfaces) */
  grid: ControlPoint[][];

  /** Derived: 4 boundary curves (SAME CP instances as the grid edges) */
  boundingCurves: {
    bottom: BoundingCurve;
    right: BoundingCurve;
    top: BoundingCurve;
    left: BoundingCurve;
  };

  /** Derived: cage visualization */
  cage: Cage;

  /** Mirror constraint (null if not a mirror) */
  mirrorOf: MirrorConstraintData | null = null;

  /** Logical grouping into a face. Shared by reference between adjacent surfaces. */
  surfaceSet: SurfaceSet | null = null;

  /** Dirty flag for frame-scheduled visual rebuilds. */
  private dirtyVisual: boolean = false;

  /** `true` while the surface is in edit mode (cage + CPs visible). */
  editing: boolean = false;
  /** Disposer returned from subscribing to ctx.viewFlags$. */
  private unsubFlags: (() => void) | null = null;

  /**
   * Tessellation cache.
   *
   * `tessellation` holds the persistent topology graph (TessPoints,
   * BorderTessPoints, Tiles, TessEdges). It is built once on first
   * tessellate() and is then kept ACROSS vertex moves. The graph is
   * only torn down when the entity structure actually changes
   * (replaceGrid / syncEntityGraph / structural ops).
   */
  tessellation: SurfaceTessellation | null = null;

  constructor(
    ctx: SurfacingEditor,
    grid: ControlPoint[][],
    curves: {
      bottom: BoundingCurve;
      right: BoundingCurve;
      top: BoundingCurve;
      left: BoundingCurve;
    },
    id?: string,
  ) {
    super(ctx, id ?? ctx.nextId('S'));
    this.grid = grid;
    this.boundingCurves = curves;
    this._registerVertices();
    // Refcount the shared curves too. `curves.bottom` etc. might already
    // have other users (when the caller reused a neighbor's curve).
    this.boundingCurves.bottom.addUser(this);
    this.boundingCurves.right.addUser(this);
    this.boundingCurves.top.addUser(this);
    this.boundingCurves.left.addUser(this);
    this.syncEntityGraph();
    // The surface view lives on ctx.workingGroup. Entity owns its own
    // visual lifetime — no external assembly step.
    this.object3d = new NurbsSurfaceObject3D(this);
    ctx.workingGroup.add(this.object3d);
    // Subscribe to view flags so faces / wireframe visibility tracks the
    // global toggle without an external fan-out. Fires once immediately
    // with the current state on attach.
    this.unsubFlags = ctx.viewFlags$.attach((flags) => {
      const view = this.object3d;
      if (!view) return;
      view.setFacesVisible(flags.faces);
      view.setWireframeVisible(flags.mesh);
    });
  }

  /** True if any grid control point has a non-unit weight. */
  get rational(): boolean {
    for (const row of this.grid) {
      for (const cp of row) {
        if (cp.weight.value !== 1) return true;
      }
    }
    return false;
  }

  /**
   * Read the current 4×4 weights matrix from the grid ControlPoints.
   * Allocates a fresh array — callers iterating in a hot loop should
   * read directly via `grid[r][c].weight.value`.
   */
  getWeightsMatrix(): number[][] {
    return this.grid.map(row => row.map(cp => cp.weight.value));
  }

  /** 4×4 of ControlPoint instances (aliases `this.grid`). */
  getCPs(): ControlPoint[][] {
    return this.grid;
  }

  /** Single ControlPoint at (row, col). */
  getCP(row: number, col: number): ControlPoint {
    return this.grid[row][col];
  }

  /**
   * Mark the visual stale. The Three.js view (this.object3d, set by its
   * constructor) will rebuild itself on the next animation frame if it
   * implements invalidate(). Called by Vertex.set() for every dependent.
   */
  invalidateVisual(): void {
    // Drop the tessellation cache synchronously so any reader on this
    // frame rebuilds from the current grid.
    this.tessellation = null;
    this.boundingCurves.bottom.invalidateTessellation();
    this.boundingCurves.right.invalidateTessellation();
    this.boundingCurves.top.invalidateTessellation();
    this.boundingCurves.left.invalidateTessellation();
    if (this.dirtyVisual) return;
    this.dirtyVisual = true;
    // Schedule on next frame — constraint cascades that move 4 CPs in a row
    // coalesce into a single rebuild. The mesh is responsible for clearing
    // its own tessellation cache when rebuild() runs.
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null;
    const flush = () => {
      this.dirtyVisual = false;
      this.object3d?.rebuildGeometry();
      // Refresh bounding-curve line geometry too so the rendered lines
      // match the new tessellation.
      this.boundingCurves.bottom.refreshGeometry();
      this.boundingCurves.right.refreshGeometry();
      this.boundingCurves.top.refreshGeometry();
      this.boundingCurves.left.refreshGeometry();
    };
    if (raf) raf(flush); else flush();
  }

  // =========================================================================
  // Entity-level visual API
  // =========================================================================

  /**
   * Tint the surface material with `color`, kill Phong glare. Used by the
   * active tool for hover, set-sibling, and preview highlighting. Tools
   * are responsible for calling `unmark()` when the tint should revert.
   */
  mark(color: number): void {
    this.object3d?.setTint(color, false);
  }

  /** Reset the surface material to base color + full glare. */
  unmark(): void {
    this.object3d?.setTint(SURFACE_BASE_COLOR, true);
  }

  /**
   * Enter the "being edited" state: rebuild + show cage lines, show CP
   * handles. No material tinting or bounding-curve marking — the active
   * tool controls those.
   */
  enterEditMode(): void {
    if (this.editing) return;
    this.editing = true;
    if (this.cage.object3d) {
      this.cage.object3d.rebuild();
      this.cage.object3d.visible = true;
    }
    for (const row of this.grid) {
      for (const cp of row) cp.setVisible(true);
    }
    this.ctx.requestRender();
  }

  /** Leave edit mode: hide cage, hide CP handles. */
  exitEditMode(): void {
    if (!this.editing) return;
    this.editing = false;
    if (this.cage.object3d) {
      this.cage.object3d.visible = false;
    }
    for (const row of this.grid) {
      for (const cp of row) {
        cp.unmark();
        cp.setVisible(false);
      }
    }
    this.ctx.requestRender();
  }

  /** Return the side index (0..3) the given curve belongs to, or -1. */
  sideOfCurve(curve: BoundingCurve): number {
    const c = this.boundingCurves;
    if (curve === c.bottom) return 0;
    if (curve === c.right) return 1;
    if (curve === c.top) return 2;
    if (curve === c.left) return 3;
    return -1;
  }

  /** Add this surface as a dependent on every vertex in the grid. */
  _registerVertices(): void {
    for (const row of this.grid) {
      for (const v of row) v.addUser(this);
    }
  }

  /** Remove this surface from the usedBy set of every vertex in the grid. */
  _unregisterVertices(): void {
    for (const row of this.grid) {
      for (const v of row) v.removeUser(this);
    }
  }

  /**
   * Structural swap: replace the grid AND the bounding curves at once.
   * Used by ops (extrude, …) that mutate a patch in place when they know
   * which grid CPs are new and which curves are affected. Keeps the
   * NurbsSurface instance itself stable, but the cage is rebuilt and the
   * tessellation cache is dropped because the topology graph references
   * the old curves / CPs.
   */
  updateGrid(
    newGrid: ControlPoint[][],
    newCurves: {
      bottom: BoundingCurve;
      right: BoundingCurve;
      top: BoundingCurve;
      left: BoundingCurve;
    },
  ): void {
    // Release the old curves (they may be shared; refcount decrements).
    this.boundingCurves.bottom.removeUser(this);
    this.boundingCurves.right.removeUser(this);
    this.boundingCurves.top.removeUser(this);
    this.boundingCurves.left.removeUser(this);

    this._unregisterVertices();
    this.grid = newGrid;
    this._registerVertices();
    this.boundingCurves = newCurves;
    this.boundingCurves.bottom.addUser(this);
    this.boundingCurves.right.addUser(this);
    this.boundingCurves.top.addUser(this);
    this.boundingCurves.left.addUser(this);

    // Dispose the old Cage and rebuild from the new grid.
    if (this.cage) this.cage.dispose();
    this.cage = null as any;
    this.tessellation = null;
    this.syncEntityGraph();
    this.invalidateVisual();
  }

  /**
   * Replace this surface with new surfaces in the same parent. This
   * surface is disposed; the replacements take its position in the
   * parent's children array.
   */
  replaceWith(newSurfaces: NurbsSurface[]): void {
    const parent = this.parent;
    if (!parent) return;
    const idx = parent.children.indexOf(this);
    if (idx < 0) return;
    parent.children.splice(idx, 1, ...newSurfaces);
    this.parent = null;
    for (const s of newSurfaces) {
      if (s.parent && s.parent !== parent) {
        const j = s.parent.children.indexOf(s);
        if (j >= 0) s.parent.children.splice(j, 1);
      }
      s.parent = parent;
    }
    this.dispose();
  }

  dispose(): void {
    if (this.unsubFlags) { this.unsubFlags(); this.unsubFlags = null; }
    this.disposeView();
    if (this.cage) {
      this.cage.dispose();
      this.cage = null as any;
    }
    this.boundingCurves.bottom.removeUser(this);
    this.boundingCurves.right.removeUser(this);
    this.boundingCurves.top.removeUser(this);
    this.boundingCurves.left.removeUser(this);
    this._unregisterVertices();
    super.dispose();
  }

  /**
   * Build the Cage entity from the current grid. BoundingCurves are
   * passed into the constructor by the caller — the surface never
   * creates them itself. Sharing of curves with adjacent surfaces is
   * fully the caller's responsibility (deserialize keeps a local edge
   * map; ops grab the existing curve off a neighbor before stitching
   * in a new patch).
   *
   * Idempotent: the Cage is only rebuilt the first time this runs.
   */
  syncEntityGraph(): void {
    this.children = [];

    if (!this.cage) {
      this.tessellation = null;
      this.cage = buildCage(this.ctx, this.grid);
    }

    this.addChild(this.cage);
  }

  /** Get the interior row/column of vertices adjacent to a side. */
  getInteriorRow(side: number, depth: number): Vertex[] {
    const g = this.grid;
    switch (side) {
      case 0: return [g[depth][0], g[depth][1], g[depth][2], g[depth][3]];
      case 1: return [g[0][3 - depth], g[1][3 - depth], g[2][3 - depth], g[3][3 - depth]];
      case 2: return [g[3 - depth][0], g[3 - depth][1], g[3 - depth][2], g[3 - depth][3]];
      case 3: return [g[0][depth], g[1][depth], g[2][depth], g[3][depth]];
      default: return [];
    }
  }

  /**
   * Get the 4 ControlPoints along a boundary edge.
   * side: 0=bottom, 1=right, 2=top, 3=left.
   */
  getEdgeVertices(side: number): [ControlPoint, ControlPoint, ControlPoint, ControlPoint] {
    const g = this.grid;
    switch (side) {
      case 0: return [g[0][0], g[0][1], g[0][2], g[0][3]];
      case 1: return [g[0][3], g[1][3], g[2][3], g[3][3]];
      case 2: return [g[3][0], g[3][1], g[3][2], g[3][3]];
      case 3: return [g[0][0], g[1][0], g[2][0], g[3][0]];
      default: return [g[0][0], g[0][1], g[0][2], g[0][3]];
    }
  }

  /** Get the 4 ControlPoints along a boundary edge */
  getEdgeCPs(side: number): [ControlPoint, ControlPoint, ControlPoint, ControlPoint] {
    return this.getBoundingCurve(side).cp;
  }

  getBoundingCurve(side: number): BoundingCurve {
    switch (side) {
      case 0: return this.boundingCurves.bottom;
      case 1: return this.boundingCurves.right;
      case 2: return this.boundingCurves.top;
      case 3: return this.boundingCurves.left;
      default: return this.boundingCurves.bottom;
    }
  }

  /**
   * Find surfaces sharing a boundary edge with this one.
   * Matches by shared ControlPoint identity — no tolerances.
   */
  findAdjacentSurfaces(): {side: number, other: NurbsSurface, otherSide: number, reversed: boolean}[] {
    const result: {side: number, other: NurbsSurface, otherSide: number, reversed: boolean}[] = [];
    // Walk to the tree root, then collect every NurbsSurface descendant.
    let root: GeometricEntity<any> = this;
    while (root.parent) root = root.parent;
    const all: NurbsSurface[] = [];
    root.traverse(e => { if (e instanceof NurbsSurface) all.push(e); });

    for (let side = 0; side < 4; side++) {
      const edge = this.getEdgeVertices(side);
      for (const other of all) {
        if (other === this) continue;
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeVertices(os);
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, other, otherSide: os, reversed: false});
          }
          if (edge[0] === otherEdge[3] && edge[1] === otherEdge[2] &&
              edge[2] === otherEdge[1] && edge[3] === otherEdge[0]) {
            result.push({side, other, otherSide: os, reversed: true});
          }
        }
      }
    }
    return result;
  }

  /** Sides of this surface with no adjacent neighbor. */
  findFreeEdges(): {side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] {
    const sharedSides = new Set(this.findAdjacentSurfaces().map(a => a.side));
    const free: {side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] = [];
    for (let side = 0; side < 4; side++) {
      if (!sharedSides.has(side)) {
        free.push({side, verts: this.getEdgeVertices(side)});
      }
    }
    return free;
  }

  /**
   * Evaluate surface point at (u, v) using Bernstein basis.
   * Always uses the rational formula (which reduces to plain Bézier when
   * all weights are 1, at a tiny fixed cost), so we don't need to cache a
   * rational flag separately.
   */
  eval(u: number, v: number): Vec3 {
    const bu = bernstein3(u), bv = bernstein3(v);
    let wx = 0, wy = 0, wz = 0, wsum = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const cp = this.grid[j][i];
      const w = bu[i] * bv[j] * cp.weight.value;
      const p = cp.position;
      wx += w * p[0]; wy += w * p[1]; wz += w * p[2]; wsum += w;
    }
    return wsum > 0 ? [wx/wsum, wy/wsum, wz/wsum] : [0, 0, 0];
  }

  normal(u: number, v: number): Vec3 {
    const eps = 1e-5;
    const du = sub(
      this.eval(Math.min(1, u + eps), v),
      this.eval(Math.max(0, u - eps), v)
    );
    const dv = sub(
      this.eval(u, Math.min(1, v + eps)),
      this.eval(u, Math.max(0, v - eps))
    );
    return normalize(cross(du, dv)) as Vec3;
  }

  /**
   * Tessellation — builds the full topology graph via the shared pipeline
   * in modules/surfacing/tessellation, caches it on the entity, and emits
   * a row-major (positions / normals / indices) buffer for the Three.js
   * mesh. The graph is watertight with adjacent surfaces: BorderTessPoints
   * on each side forward their xyz to CurveTessPoints shared with any
   * surface that references the same BoundingCurve, so positions along a
   * shared edge are literally equal. Normals stay per-surface so creases
   * survive.
   */
  /**
   * Ensure the tessellation graph is built and fresh. Returns the cached
   * graph if the resolution hasn't changed.
   */
  tessellate(): SurfaceTessellation {
    if (this.tessellation) return this.tessellation;
    const n = this.ctx.resolution;

    this.boundingCurves.bottom.ensureTessellated(this, 0);
    this.boundingCurves.right.ensureTessellated(this, 1);
    this.boundingCurves.top.ensureTessellated(this, 2);
    this.boundingCurves.left.ensureTessellated(this, 3);

    this.tessellation = tessellateSurface(this, n);
    return this.tessellation;
  }

  /**
   * Boundary polyline for one side, sharing sample points with the shaded
   * mesh tessellation. side: 0=bottom, 1=right, 2=top, 3=left.
   * Returns (resolution+1) points as [x,y,z] triples.
   */
  /** UV-grid isolines (rows + cols) sharing the mesh tessellation. */
  getIsolinePolylines(): {rows: number[][][], cols: number[][][]} {
    const g = this.tessellate().pointGrid;
    const n = this.ctx.resolution;
    const xyz = (p: any): number[] => [p.xyz[0], p.xyz[1], p.xyz[2]];
    const rows: number[][][] = [];
    for (let j = 0; j <= n; j++) {
      const row: number[][] = [];
      for (let i = 0; i <= n; i++) row.push(xyz(g[j][i]));
      rows.push(row);
    }
    const cols: number[][][] = [];
    for (let i = 0; i <= n; i++) {
      const col: number[][] = [];
      for (let j = 0; j <= n; j++) col.push(xyz(g[j][i]));
      cols.push(col);
    }
    return {rows, cols};
  }
}

// =========================================================================
// Helpers
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt * mt * mt, 3 * mt * mt * t, 3 * mt * t * t, t * t * t];
}

function buildCage(ctx: SurfacingEditor, cp: ControlPoint[][]): Cage {
  // ControlPoint extends Vertex, so each grid cell IS a Vertex.
  const vertexSet = new Set<Vertex>();
  for (const row of cp) {
    for (const c of row) vertexSet.add(c);
  }

  const segments: Line[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      segments.push(new Line(ctx, cp[row][col], cp[row][col + 1]));
    }
  }
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) {
      segments.push(new Line(ctx, cp[row][col], cp[row + 1][col]));
    }
  }

  return new Cage(ctx, Array.from(vertexSet), segments);
}
