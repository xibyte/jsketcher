import ScalableLine from 'scene/objects/scalableLine';
import type {BoundingCurve} from './BoundingCurve.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {
  EntityObject3D,
  tessellateCubicBezier,
  EDGE_COLORS, EDGE_HOVER_COLOR,
  EDGE_WIDTH,
} from '../../three';

const FALLBACK_SEGMENTS = 24;
const HIGHLIGHT_WIDTH_MULTIPLIER = 1.35;

/**
 * Three.js visual for a BoundingCurve entity.
 *
 * A bounding curve is shared between every surface that references its edge
 * (identity comes from Scene._curveRegistry). This single view is therefore
 * used for all of them:
 *
 *   - When globally visible (scene edges view mode): drawn with a neutral
 *     color at EDGE_WIDTH, non-pickable.
 *   - When "highlighted as side N": forced visible (overriding the global
 *     toggle), colored by EDGE_COLORS[N], ~2× wider, pickable for edge
 *     dialogs. N is the side index relative to the CURRENTLY selected
 *     surface — not the curve's intrinsic `side`, which belongs to whoever
 *     registered it first.
 *
 * Polyline source: `curve.samples` (shared CurveTessPoints produced by
 * `tessellateCurve`). If the curve hasn't been sampled yet, this view
 * forces one of its user surfaces to tessellate, which populates the
 * samples as a side-effect. Only if the curve has no users at all (shouldn't
 * happen in a live scene) do we fall back to a rough cubic Bézier eval.
 */
export class BoundingCurveObject3D extends EntityObject3D {

  readonly curve: BoundingCurve;
  private sceneSetup: any;
  private line: any = null;
  private _globallyVisible: boolean = false;
  private _highlightSide: number = -1;
  private _highlightColor: number | null = null;
  private _clickHandler: ((curve: BoundingCurve) => void) | null = null;

  constructor(curve: BoundingCurve, sceneSetup: any) {
    super();
    this.curve = curve;
    this.sceneSetup = sceneSetup;
    this.visible = false;
    // No initial rebuild — a curve that's never on screen should never
    // allocate a ScalableLine. The first setHighlightSide / setGlobalVisibility
    // that turns visibility on will build it lazily.
  }

  /**
   * Replace the ScalableLine from the current samples + current highlight
   * state. Drops any previous line.
   *
   * This is the ONLY path that paints anything — setHighlightSide and
   * setGlobalVisibility change state and then trigger rebuild(). We don't
   * try to patch color / linewidth on a live ScalableLine because its
   * shader caches those at construction and doesn't react to in-place
   * updates, so a stale line would silently keep its original color.
   */
  rebuild(): void {
    this.disposeLine();

    if (!this.visible) return;

    const pts = this.readPolyline();
    if (pts.length < 2) return;

    const color = this.currentColor();
    const width = this.currentWidth();
    const highlighted = this._highlightSide >= 0 || this._highlightColor !== null;
    const line: any = new ScalableLine(this.sceneSetup, pts, width, color);
    // Only highlighted curves (selection sides, bridge/fill-hole preview)
    // should punch through the mesh — plain globally-visible edges respect
    // depth so backside edges don't bleed through.
    line.material.depthTest = !highlighted;
    line.material.transparent = highlighted;
    line.material.opacity = highlighted ? 0.9 : 1.0;
    line.renderOrder = highlighted ? 2 : 1;

    const self = this;
    line.onMouseEnter = () => { if (self._highlightSide >= 0) self.setHover(true); };
    line.onMouseLeave = () => { if (self._highlightSide >= 0) self.setHover(false); };
    line.onMouseClick = () => {
      if (self._highlightSide < 0) return;
      if (self._clickHandler) self._clickHandler(self.curve);
    };

    this.line = line;
    this.add(line);
  }

  /** Install / clear the click handler (scene-level callback). */
  setClickHandler(cb: ((curve: BoundingCurve) => void) | null): void {
    this._clickHandler = cb;
  }

  /**
   * Toggle the non-selected "global edges view" visibility. When true the
   * curve is drawn with the neutral base color; when false it's hidden
   * unless a selection highlight overrides.
   */
  setGlobalVisibility(visible: boolean): void {
    if (this._globallyVisible === visible) return;
    this._globallyVisible = visible;
    this._applyState();
  }

  /**
   * Highlight this curve as "side N of the currently selected surface":
   * forces it visible, recolors, and widens. Pass -1 to clear.
   */
  setHighlightSide(side: number): void {
    if (this._highlightSide === side) return;
    this._highlightSide = side;
    this._applyState();
  }

  /**
   * Highlight this curve with an arbitrary color (e.g. bridge-mode green /
   * orange). Forces visibility and applies the same width multiplier as
   * `setHighlightSide`. Pass `null` to clear.
   *
   * Takes precedence over side highlight in `currentColor` so a color override
   * stays stable even if a selection-side highlight lands on the same curve.
   */
  setHighlightColor(color: number | null): void {
    if (this._highlightColor === color) return;
    this._highlightColor = color;
    this._applyState();
  }

  /**
   * Commit the current `_highlightSide` / `_globallyVisible` state to the
   * scene graph. Toggles the Group's `visible` flag and, if the curve
   * needs to be drawn, rebuilds the line so it picks up the new color /
   * width. If the curve is now hidden, drops the line so we don't carry
   * geometry for something nobody's looking at.
   */
  private _applyState(): void {
    const shouldShow = this._highlightSide >= 0
      || this._highlightColor !== null
      || this._globallyVisible;
    this.visible = shouldShow;
    if (shouldShow) {
      this.rebuild();
    } else {
      this.disposeLine();
    }
  }

  private currentColor(): number {
    if (this._highlightColor !== null) return this._highlightColor;
    if (this._hovered && this._highlightSide >= 0) return EDGE_HOVER_COLOR;
    if (this._highlightSide >= 0) {
      return EDGE_COLORS[this._highlightSide] || EDGE_COLORS[0];
    }
    return 0x000000;
  }

  private currentWidth(): number {
    const emphasized = this._highlightSide >= 0 || this._highlightColor !== null;
    return emphasized ? EDGE_WIDTH * HIGHLIGHT_WIDTH_MULTIPLIER : EDGE_WIDTH;
  }

  /**
   * Read the polyline from `curve.samples`, forcing tessellation if the
   * curve has a user surface but no samples yet. Falls back to a cubic
   * Bézier eval (non-rational!) only for truly orphan curves.
   */
  private readPolyline(): number[][] {
    const curve = this.curve;

    if (!curve.samples && curve.users.size > 0) {
      const anyUser: NurbsSurface | undefined = curve.users.values().next().value;
      // Any user can act as the reference — they all agree on the isoline
      // because weights live on shared per-vertex ControlPoints.
      if (anyUser) anyUser.tessellate(anyUser.object3d ? (8) : 8);
    }

    if (curve.samples) {
      return curve.samples.map(s => [s.xyz[0], s.xyz[1], s.xyz[2]]);
    }

    // Truly orphan curve — no surface to sample from. This is a debug
    // fallback; in a live scene every curve has at least one user.
    const cps: [number, number, number][] =
      curve.cp.map(c => [c.position[0], c.position[1], c.position[2]]);
    return tessellateCubicBezier(cps, FALLBACK_SEGMENTS);
  }

  protected onHoverChanged(_hover: boolean): void {
    // ScalableLine's shader caches its color uniform at construction, so
    // we can't patch it in place — rebuild to restamp the color.
    if (this.visible) this.rebuild();
  }

  protected onSelectedChanged(_selected: boolean): void {
    // `selected` on this object3d isn't the same as the highlight — the
    // highlight is driven by the owning surface's selection via
    // setHighlightSide(). Leave this hook empty so stray select() calls on
    // the curve object3d don't fight the highlight state.
  }

  isSelectable(): boolean {
    return this._highlightSide >= 0;
  }

  private disposeLine(): void {
    if (!this.line) return;
    this.remove(this.line);
    if (this.line.geometry) this.line.geometry.dispose();
    if (this.line.material) this.line.material.dispose();
    this.line = null;
  }

  protected onDispose(): void {
    this.disposeLine();
  }
}
