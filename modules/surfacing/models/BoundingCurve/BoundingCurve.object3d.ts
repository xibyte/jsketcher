import ScalableLine from 'scene/objects/scalableLine';
import type {BoundingCurve} from './BoundingCurve.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {
  EntityObject3D,
  tessellateCubicBezier,
  EDGE_WIDTH,
} from '../../three';

const FALLBACK_SEGMENTS = 24;

/**
 * Dumb Three.js view for a BoundingCurve entity.
 *
 * The entity owns all state (marked color, base visibility, width). This
 * class is a plain Group that exposes two thin methods:
 *
 *   - `paint(color, width, punchThrough)` — rebuild the ScalableLine with
 *     these attributes. `punchThrough` flips depthTest off + transparent
 *     on so the line draws over the mesh (used for selection/preview).
 *   - `hide()` — drop the line and hide the Group.
 *
 * Polyline source: `curve.samples` (shared CurveTessPoints produced by
 * `tessellateCurve`). If the curve hasn't been sampled yet we ask a user
 * surface to tessellate, which populates samples as a side-effect. Only
 * for truly orphan curves do we fall back to a non-rational cubic Bézier.
 */
export class BoundingCurveObject3D extends EntityObject3D {

  readonly curve: BoundingCurve;
  private sceneSetup: any;
  private line: any = null;

  constructor(curve: BoundingCurve, sceneSetup: any) {
    super();
    this.curve = curve;
    this.sceneSetup = sceneSetup;
    this.visible = false;
  }

  /**
   * Show the line with the given paint. Rebuilds from scratch — the
   * Line2 shader caches uniforms at construction so color / linewidth
   * can't be patched in place.
   */
  paint(color: number, width: number, punchThrough: boolean): void {
    this.disposeLine();

    const pts = this.readPolyline();
    if (pts.length < 2) {
      this.visible = false;
      return;
    }

    const line: any = new ScalableLine(this.sceneSetup, pts, width, color);
    line.material.depthTest = !punchThrough;
    line.material.transparent = punchThrough;
    line.material.opacity = punchThrough ? 0.9 : 1.0;
    line.renderOrder = punchThrough ? 2 : 1;
    (line as any).userData = {entity: this.curve};

    this.line = line;
    this.add(line);
    this.visible = true;
  }

  /** Drop the line and hide the Group. */
  hide(): void {
    this.disposeLine();
    this.visible = false;
  }

  /**
   * Rebuild the current line in place (same paint, fresh geometry).
   * Called by the entity after tessellation state is invalidated /
   * refreshed — e.g. after a drag or a structural edit.
   */
  refreshGeometry(): void {
    if (!this.visible || !this.line) return;
    const width = this.line.material.linewidth;
    const color = this.line.material.color.getHex();
    const punchThrough = !this.line.material.depthTest;
    this.paint(color, width, punchThrough);
  }

  private readPolyline(): number[][] {
    const curve = this.curve;

    if (!curve.tessellation && curve.users.size > 0) {
      const anyUser: NurbsSurface | undefined = curve.users.values().next().value;
      if (anyUser) anyUser.tessellate();
    }

    if (curve.tessellation) {
      return curve.tessellation.samples.map(s => [s.xyz[0], s.xyz[1], s.xyz[2]]);
    }

    const cps: [number, number, number][] =
      curve.cp.map(c => [c.position[0], c.position[1], c.position[2]]);
    return tessellateCubicBezier(cps, FALLBACK_SEGMENTS);
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

export {EDGE_WIDTH};
