import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {CurveTessellation} from '../../tessellation/types';
import type {SurfacingEditor} from '../../SurfacingEditor';
import {BoundingCurveObject3D} from './BoundingCurve.object3d';
import {EDGE_WIDTH} from '../../three';
import {allocateCurveSamples} from '../../tessellation/tessellateCurve';

const MARK_WIDTH_MULTIPLIER = 1.35;
const EDGE_BASE_COLOR = 0x000000;

export type ArcMode = 'approximate' | 'rational';

export interface ArcConstraintData {
  radius: number;
  /** Sweep angle in degrees */
  angle: number;
  /** Normal of the arc plane */
  planeNormal: Vec3;
  /** Center of the arc circle */
  center: Vec3;
  mode: ArcMode;
}

/**
 * An implicit cubic Bézier curve at the boundary of a NurbsSurface.
 * Cannot exist without a parent surface. Carries arc constraints.
 * The 4 control points are the SAME instances as the surface's edge CPs.
 *
 * side: 0=bottom (row 0), 1=right (col 3), 2=top (row 3), 3=left (col 0)
 */
export class BoundingCurve extends GeometricEntity<BoundingCurveObject3D> {

  side: number;
  cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint];
  arcConstraint: ArcConstraintData | null = null;

  /** Complete tessellation state, or null if never tessellated / invalidated. */
  tessellation: CurveTessellation | null = null;

  /**
   * Every NurbsSurface that currently references this curve on one of its
   * sides. Populated by Scene._wireBoundingCurves when surfaces are added
   * / removed. When the set becomes empty the curve is dropped from the
   * Scene registry.
   */
  users: Set<NurbsSurface> = new Set();

  /** Currently painted color, or `null` if unmarked. */
  private markedColor: number | null = null;
  /** `true` while `select()` has been applied. Locks out mark/unmark/refresh. */
  private _selected: boolean = false;
  /** Disposer returned from subscribing to ctx.viewFlags$. */
  private unsubFlags: (() => void) | null = null;

  constructor(ctx: SurfacingEditor, side: number, cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]) {
    super(ctx, generateEntityId('BC'));
    this.side = side;
    this.cp = cp;
    this.object3d = new BoundingCurveObject3D(this, ctx.sceneSetup);
    ctx.workingGroup.add(this.object3d);
    // Subscribe to view flags — the StateStream fires immediately with the
    // current value so the initial visibility lands without extra work.
    this.unsubFlags = ctx.viewFlags$.attach(() => {
      if (this._selected) return;
      if (this.markedColor !== null) return;
      this.applyDefaultVisibility();
    });
  }

  // -----------------------------------------------------------------------
  // High-level visual state (see user's select/highlight sketch).
  // -----------------------------------------------------------------------

  /**
   * Lock the curve into an explicit "selected" paint with a specific
   * color. While selected every other state transition on this curve
   * (`mark`, `unmark`, `refreshDefaultVisibility`) is a no-op — the only
   * way back is via `deselect()`. Used by `NurbsSurface.selectBoundingCurve`
   * when the user clicks a boundary edge on a selected surface.
   */
  select(color: number): void {
    // `mark()` guards on `_selected` and bails, so we have to release
    // the lock for the duration of the paint (this is also the path
    // that re-colors an already-selected curve, e.g. when the user
    // picks an edge on a surface whose 4 sides are already in select()
    // state).
    this._selected = false;
    this.mark(color);
    this._selected = true;
  }

  /** Release the selected lock and fall back to the view-flag default. */
  deselect(): void {
    if (!this._selected) return;
    this._selected = false;
    this.unmark();
  }

  /** `true` while `select()` has been applied. */
  get selected(): boolean {
    return this._selected;
  }

  /**
   * Force the curve visible with a given punch-through color. Used for
   * selection side highlights, bridge/fill-hole previews, and the dark
   * outlines shown during surface hover. Width is the default edge width
   * times the highlight multiplier so marked curves read as emphasized.
   *
   * No-op when the curve is in `select()`ed state — the selected color
   * always wins over a mark.
   */
  mark(color: number): void {
    if (this._selected) return;
    const view = this.object3d;
    if (!view) return;
    this.markedColor = color;
    view.paint(color, EDGE_WIDTH * MARK_WIDTH_MULTIPLIER, true);
    this.ctx.requestRender();
  }

  /**
   * Reset the curve to its default visibility for the current view flags.
   *   - edges=true → always shown (base color, depth-tested)
   *   - boundaries=true → shown only if this curve is a set-silhouette
   *   - otherwise → hidden
   *
   * No-op while `select()`ed.
   */
  unmark(): void {
    if (this._selected) return;
    if (!this.object3d) return;
    this.markedColor = null;
    this.applyDefaultVisibility();
  }

  /**
   * Re-evaluate default visibility against the current view flags.
   * Called by the editor whenever the flags stream ticks. No-op while
   * `select()`ed or actively marked.
   */
  refreshDefaultVisibility(): void {
    if (!this.object3d) return;
    if (this._selected) return;
    if (this.markedColor !== null) return;
    this.applyDefaultVisibility();
  }

  /** Refresh the painted line after the curve's samples changed. */
  refreshGeometry(): void {
    this.object3d?.refreshGeometry();
  }

  /** `true` if a mark() is currently applied. */
  get marked(): boolean {
    return this.markedColor !== null;
  }

  private applyDefaultVisibility(): void {
    const view = this.object3d;
    if (!view) return;
    const flags = this.ctx.viewFlags$.value;
    const show = flags.edges || (flags.boundaries && this.isSetSilhouette());
    if (show) {
      view.paint(EDGE_BASE_COLOR, EDGE_WIDTH, false);
    } else {
      view.hide();
    }
    this.ctx.requestRender();
  }

  /**
   * True when this curve is a silhouette of a logical face:
   * - fewer than 2 users (a true free edge), or
   * - its users span more than one SurfaceSet.
   * Inner edges inside a single face's cap don't count.
   */
  private isSetSilhouette(): boolean {
    if (this.users.size < 2) return true;
    let firstSet: any = undefined;
    for (const user of this.users) {
      if (!user.surfaceSet) return true;
      if (firstSet === undefined) firstSet = user.surfaceSet;
      else if (firstSet !== user.surfaceSet) return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Refcounted lifetime — add/removeUser keeps `users` in sync. When the
  // last user surface is removed the curve disposes itself (drops its
  // view, drops cached tessellation state).
  // -----------------------------------------------------------------------

  addUser(surface: NurbsSurface): void {
    this.users.add(surface);
    // users.size going 1 → 2+ (or ≥ 2 with mixed sets) can flip the
    // set-silhouette predicate. Re-evaluate default visibility.
    this.refreshDefaultVisibility();
  }

  removeUser(surface: NurbsSurface): void {
    this.users.delete(surface);
    this.tessellation?.perSurface.delete(surface);
    if (this.users.size === 0) {
      this.dispose();
      return;
    }
    this.refreshDefaultVisibility();
  }

  dispose(): void {
    if (this.unsubFlags) { this.unsubFlags(); this.unsubFlags = null; }
    this.disposeView();
    this.invalidateTessellation();
    super.dispose();
  }

  /** Drop cached tessellation — forces full rebuild on next ensureTessellated. */
  invalidateTessellation(): void {
    this.tessellation = null;
  }

  /**
   * Ensure this curve has valid tessellation at the current resolution.
   * Returns immediately if cached and resolution hasn't changed.
   */
  ensureTessellated(referenceSurface: NurbsSurface, side: number): void {
    if (this.tessellation) return;
    const n = this.ctx.resolution;
    this.tessellation = {
      resolution: n,
      samples: allocateCurveSamples(this, referenceSurface, side, n),
      perSurface: new Map(),
      edges: [],
    };
  }

  /** Evaluate the cubic Bézier curve at parameter t */
  eval(t: number): Vec3 {
    const mt = 1 - t;
    const p0 = this.cp[0].position;
    const p1 = this.cp[1].position;
    const p2 = this.cp[2].position;
    const p3 = this.cp[3].position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }
}
