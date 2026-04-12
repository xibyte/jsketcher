import type {Vec3} from 'math/vec';
import {normalize, sub, cross} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';
import {Cage} from '../Cage/Cage.entity';
import {Line} from '../Line/Line.entity';
import type {SurfaceSet} from '../../SurfaceSet';
import type {SurfacingContext} from '../../SurfacingContext';
import {
  tessellateSurface,
  refreshSurfaceTessellation,
  type SurfaceTessellation,
} from '../../tessellation/tessellateSurface';
import type {TessPoint, BorderTessPoint} from '../../tessellation/types';
import {NurbsSurfaceObject3D} from './NurbsSurface.object3d';
import {
  SURFACE_BASE_COLOR,
  SURFACE_HOVER_COLOR,
  EDGE_COLORS,
} from '../../three';

/** Color painted on sibling surfaces sharing the same SurfaceSet during
 *  hover — a slightly lighter shade of SURFACE_HOVER_COLOR (0x88bbee). */
const SURFACE_SET_HOVER_COLOR = 0xb0d4f3;
/** Default color painted on bounding curves during the hover "dark outline" state. */
const HOVER_CURVE_COLOR = 0x111111;
/** Color painted on a bounding curve selected as an "edge" while the surface is selected. */
const EDGE_SELECTED_COLOR = 0xffffff;

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
export class NurbsSurface extends GeometricEntity {

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
  private _dirtyVisual: boolean = false;

  // -----------------------------------------------------------------------
  // Visual state — selection + highlight (hover) + marked (set sibling tint).
  // All three flags are owned by the entity. The view is a dumb paint
  // surface that the methods below drive directly. The editor tracks which
  // surface is currently `highlighted` and `selected` and calls the
  // corresponding methods on transitions; entities decide exactly what to
  // paint.
  // -----------------------------------------------------------------------

  /** `true` while this surface is the editor's current selection. */
  selected: boolean = false;
  /** `true` while `mark()` has been applied (material tinted, no glare). */
  private _marked: boolean = false;
  /** `true` while `highlight()` has been applied (mark + dark curves). */
  private _highlighted: boolean = false;
  /** The bounding curve currently selected as an "edge" on this surface, if any. */
  selectedBoundingCurve: BoundingCurve | null = null;
  /** Disposer returned from subscribing to ctx.viewFlags$. */
  private _unsubFlags: (() => void) | null = null;

  /**
   * Tessellation cache.
   *
   * `_tessGraph` holds the persistent topology graph (TessPoints,
   * BorderTessPoints, Tiles, TessEdges). It is built once on first
   * tessellate() and is then kept ACROSS vertex moves — a drag doesn't
   * invalidate the graph, it only marks it dirty. The next tessellate()
   * refreshes xyz / normal values in place via
   * refreshSurfaceTessellation, leaving every instance untouched.
   * The graph is only torn down when the entity structure actually
   * changes (replaceGrid / syncEntityGraph / structural ops).
   *
   * `_tess` holds the flat row-major buffer the Three.js mesh uploads.
   * `_tessDirty` is set by invalidateVisual() and cleared by tessellate().
   */
  private _tess: {positions: number[], normals: number[], indices: number[]} | null = null;
  private _tessGraph: SurfaceTessellation | null = null;
  private _tessRes: number = -1;
  private _tessDirty: boolean = false;

  constructor(
    ctx: SurfacingContext,
    grid: ControlPoint[][],
    curves: {
      bottom: BoundingCurve;
      right: BoundingCurve;
      top: BoundingCurve;
      left: BoundingCurve;
    },
    id?: string,
  ) {
    super(ctx, id ?? generateEntityId('S'));
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
    this._unsubFlags = ctx.viewFlags$.attach((flags) => {
      const view = this._view;
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
    this._tess = null;
    this._tessGraph = null;
    this._tessRes = -1;
    this.boundingCurves.bottom.invalidateTessellation();
    this.boundingCurves.right.invalidateTessellation();
    this.boundingCurves.top.invalidateTessellation();
    this.boundingCurves.left.invalidateTessellation();
    if (this._dirtyVisual) return;
    this._dirtyVisual = true;
    // Schedule on next frame — constraint cascades that move 4 CPs in a row
    // coalesce into a single rebuild. The mesh is responsible for clearing
    // its own tessellation cache when rebuild() runs.
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null;
    const flush = () => {
      this._dirtyVisual = false;
      this._view?.rebuildGeometry();
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
  // High-level visual API
  // =========================================================================

  /**
   * Apply the "hover tint" style to this surface and its SurfaceSet
   * siblings:
   *   - self: material = SURFACE_HOVER_COLOR (no glare) + 4 bounding
   *     curves marked dark.
   *   - siblings in the same SurfaceSet: material = SURFACE_SET_HOVER_COLOR.
   *
   * No-op if the surface is currently selected — hovering a selected
   * surface would fight with the selection's cage + side-colored curves.
   */
  highlight(): void {
    if (this.selected) return;
    if (this._highlighted) return;
    this._highlighted = true;
    this._view?.setTint(SURFACE_HOVER_COLOR, false);
    this._markCurves(HOVER_CURVE_COLOR);
    // Dim-tint siblings in the same SurfaceSet so a logical face (e.g. the
    // 5 patches of a cylinder cap) reads as a single hover target.
    const set = this.surfaceSet;
    if (set) {
      for (const sibling of set.surfaces) {
        if (sibling !== this) sibling.mark(SURFACE_SET_HOVER_COLOR);
      }
    }
  }

  /** Revert a prior `highlight()`. No-op when selected or never highlighted. */
  unhighlight(): void {
    if (this.selected) return;
    if (!this._highlighted) return;
    this._highlighted = false;
    this._view?.setTint(SURFACE_BASE_COLOR, true);
    this._unmarkCurves();
    const set = this.surfaceSet;
    if (set) {
      for (const sibling of set.surfaces) {
        if (sibling !== this) sibling.unmark();
      }
    }
  }

  /**
   * Paint the surface with `color` and no glare. Used for sibling
   * surfaces in the same SurfaceSet while another member is hovered
   * (dim "set is active" tint).
   */
  mark(color: number = SURFACE_SET_HOVER_COLOR): void {
    if (this.selected) return;
    this._marked = true;
    this._view?.setTint(color, false);
  }

  /** Revert a prior `mark()`. No-op when selected or never marked. */
  unmark(): void {
    if (this.selected) return;
    if (!this._marked) return;
    this._marked = false;
    this._view?.setTint(SURFACE_BASE_COLOR, true);
  }

  /**
   * Select this surface: undo any prior highlight, flip to the "being
   * edited" visual state (cage + CP handles + side-colored curves), and
   * notify the editor adapter so it can open the props dialog.
   */
  select(): void {
    if (this.selected) return;
    // Drop any hover visuals before switching to selected style.
    if (this._highlighted) this.unhighlight();
    if (this._marked) this.unmark();

    this.selected = true;
    // Cage outline
    if (this.cage?.object3d) {
      (this.cage.object3d as any).rebuild?.();
      (this.cage.object3d as any).visible = true;
    }
    // CP handles
    for (const row of this.grid) {
      for (const cp of row) cp.setVisible(true);
    }
    // Side-colored bounding curves
    this._selectCurvesSideColors();

    this.ctx.editor?.onSurfaceSelected(this);
    this.ctx.requestRender();
  }

  /** Revert a prior `select()`. No-op if not selected. */
  deselect(): void {
    if (!this.selected) return;
    // Clear any nested edge selection first. Release the curve lock
    // directly (not via deselectBoundingCurve which would re-mark it
    // side-color only for us to unmark it again a few lines below).
    if (this.selectedBoundingCurve) {
      this.selectedBoundingCurve.deselect();
      this.selectedBoundingCurve = null;
      this.ctx.editor?.onBoundingCurveDeselected();
    }

    this.selected = false;
    // Hide cage
    if (this.cage?.object3d) {
      (this.cage.object3d as any).visible = false;
    }
    // Hide CP handles
    for (const row of this.grid) {
      for (const cp of row) {
        cp.setVisible(false);
        cp.setSelected(false);
        cp.setHovered(false);
      }
    }
    // Bounding curves revert to view-flag default visibility
    this._deselectCurves();


    this.ctx.editor?.onSurfaceDeselected(this);
    this.ctx.requestRender();
  }

  /**
   * Select one of this surface's bounding curves as the active "edge".
   * Requires the surface to already be selected — otherwise the edge
   * dialog has no surface context to live in. Locks the curve into its
   * selected color via `BoundingCurve.select()`, so any hover mark() on
   * this or an adjacent surface won't override it.
   */
  selectBoundingCurve(curve: BoundingCurve): void {
    if (!this.selected) return;
    if (this.selectedBoundingCurve === curve) return;
    if (this.selectedBoundingCurve) this.deselectBoundingCurve();
    this.selectedBoundingCurve = curve;
    curve.select(EDGE_SELECTED_COLOR);
    this.ctx.editor?.onBoundingCurveSelected(this, curve);
    this.ctx.requestRender();
  }

  /**
   * Revert a prior `selectBoundingCurve()`. No-op if none selected.
   * Releases the curve lock and re-marks it with the surface's own side
   * color so it rejoins the selected-surface visual (cage + side colors).
   */
  deselectBoundingCurve(): void {
    if (!this.selected) return;
    const curve = this.selectedBoundingCurve;
    if (!curve) return;
    this.selectedBoundingCurve = null;
    // Release the edge lock and re-apply the surface's side color so the
    // curve rejoins the rest of the selected-surface visual.
    curve.deselect();
    const side = this._sideOfCurve(curve);
    if (side >= 0) curve.select(EDGE_COLORS[side] ?? EDGE_COLORS[0]);
    this.ctx.editor?.onBoundingCurveDeselected();
    this.ctx.requestRender();
  }

  /** Mark each of the 4 bounding curves with a flat color. */
  private _markCurves(color: number): void {
    this.boundingCurves.bottom.mark(color);
    this.boundingCurves.right.mark(color);
    this.boundingCurves.top.mark(color);
    this.boundingCurves.left.mark(color);
  }

  /** Mark each of the 4 bounding curves with its side color. */
  private _selectCurvesSideColors(): void {
    const c = this.boundingCurves;
    c.bottom.select(EDGE_COLORS[0]);
    c.right.select(EDGE_COLORS[1]);
    c.top.select(EDGE_COLORS[2]);
    c.left.select(EDGE_COLORS[3]);
  }

  private _deselectCurves(): void {
    const c = this.boundingCurves;
    c.bottom.deselect();
    c.right.deselect();
    c.top.deselect();
    c.left.deselect();
  }

  /**
   * Revert all 4 bounding curves to their view-flag defaults. Runs both
   * `deselect()` (for curves left in `select()` state by the surface's
   * own selection) and `unmark()` (for curves left in `mark()` state by
   * a prior hover). Each is a no-op when the corresponding state isn't
   * set, so calling both is safe.
   */
  private _unmarkCurves(): void {
    const c = this.boundingCurves;
    for (const cv of [c.bottom, c.right, c.top, c.left]) {
      cv.deselect();
      cv.unmark();
    }
  }

  /** Return the side index (0..3) the given curve belongs to, or -1. */
  private _sideOfCurve(curve: BoundingCurve): number {
    const c = this.boundingCurves;
    if (curve === c.bottom) return 0;
    if (curve === c.right) return 1;
    if (curve === c.top) return 2;
    if (curve === c.left) return 3;
    return -1;
  }

  /** Typed accessor for the Three.js view. */
  private get _view(): NurbsSurfaceObject3D | null {
    return this.object3d as NurbsSurfaceObject3D | null;
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
    this._tess = null;
    this._tessGraph = null;
    this._tessRes = -1;
    this._tessDirty = false;
    this.syncEntityGraph();
    this.invalidateVisual();
  }

  /**
   * Tear down the surface's own view, its Cage, drop from every
   * referenced shared entity's user set. Shared entities (CPs, curves)
   * self-dispose when their last user leaves.
   */
  dispose(): void {
    if (this._unsubFlags) { this._unsubFlags(); this._unsubFlags = null; }
    if (this.object3d) {
      (this.object3d as any).parent?.remove(this.object3d);
      if (typeof (this.object3d as any).dispose === 'function') {
        (this.object3d as any).dispose();
      }
      this.object3d = null;
    }
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
      this._tess = null;
      this._tessGraph = null;
      this._tessRes = -1;
      this._tessDirty = false;
      this.cage = buildCage(this.ctx, this.grid);
    }

    this.addChild(this.cage);
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
  tessellate(resolution: number = 8): {
    positions: number[], normals: number[], indices: number[]
  } {
    if (this._tess && this._tessRes === resolution) return this._tess;

    const graph = tessellateSurface(this, resolution);
    const n = resolution;

    const positions: number[] = [];
    const normals: number[] = [];
    for (let r = 0; r <= n; r++) {
      for (let c = 0; c <= n; c++) {
        const p = graph.pointGrid[r][c];
        const xyz = p.xyz;
        positions.push(xyz[0], xyz[1], xyz[2]);
        // TessPoint and BorderTessPoint both expose `normal`.
        const nm = (p as TessPoint | BorderTessPoint).normal;
        normals.push(nm[0], nm[1], nm[2]);
      }
    }

    // Row-major indices: two triangles per quad cell.
    const indices: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const a = r * (n + 1) + c;
        const b = a + 1;
        const cc = a + (n + 1);
        const d = cc + 1;
        indices.push(a, b, d, a, d, cc);
      }
    }

    this._tess = {positions, normals, indices};
    this._tessGraph = graph;
    this._tessRes = resolution;
    return this._tess;
  }

  /** The topology graph produced by the most recent tessellate() call. */
  getTessellationGraph(): SurfaceTessellation | null {
    return this._tessGraph;
  }

  /**
   * Boundary polyline for one side, sharing sample points with the shaded
   * mesh tessellation. side: 0=bottom, 1=right, 2=top, 3=left.
   * Returns (resolution+1) points as [x,y,z] triples.
   */
  getEdgePolyline(side: number, resolution: number = 8): number[][] {
    const t = this.tessellate(resolution);
    const n = resolution;
    const get = (row: number, col: number): number[] => {
      const i = (row * (n + 1) + col) * 3;
      return [t.positions[i], t.positions[i + 1], t.positions[i + 2]];
    };
    const pts: number[][] = [];
    switch (side) {
      case 0: for (let i = 0; i <= n; i++) pts.push(get(0, i)); break;
      case 1: for (let j = 0; j <= n; j++) pts.push(get(j, n)); break;
      case 2: for (let i = 0; i <= n; i++) pts.push(get(n, i)); break;
      case 3: for (let j = 0; j <= n; j++) pts.push(get(j, 0)); break;
    }
    return pts;
  }

  /** UV-grid isolines (rows + cols) sharing the mesh tessellation. */
  getIsolinePolylines(resolution: number = 8): {rows: number[][][], cols: number[][][]} {
    const t = this.tessellate(resolution);
    const n = resolution;
    const get = (row: number, col: number): number[] => {
      const i = (row * (n + 1) + col) * 3;
      return [t.positions[i], t.positions[i + 1], t.positions[i + 2]];
    };
    const rows: number[][][] = [];
    for (let j = 0; j <= n; j++) {
      const row: number[][] = [];
      for (let i = 0; i <= n; i++) row.push(get(j, i));
      rows.push(row);
    }
    const cols: number[][][] = [];
    for (let i = 0; i <= n; i++) {
      const col: number[][] = [];
      for (let j = 0; j <= n; j++) col.push(get(j, i));
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

function buildCage(ctx: SurfacingContext, cp: ControlPoint[][]): Cage {
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
