import type {BoundingCurve} from './BoundingCurve.entity';
import {
  EntityObject3D,
  tessellateCubicBezier,
  EDGE_COLORS, EDGE_HOVER_COLOR, EDGE_SELECTED_COLOR,
  EDGE_WIDTH,
} from '../../three';

const EDGE_SEGMENTS = 24;

/**
 * Three.js visual for a BoundingCurve entity.
 * Renders the cubic Bézier boundary edge as a constant-screen-width polyline.
 */
export class BoundingCurveObject3D extends EntityObject3D {

  curve: BoundingCurve;
  line: any; // ScalableLine — loaded lazily to avoid hard dep
  private baseColor: number;

  constructor(curve: BoundingCurve, sceneSetup: any) {
    super();
    this.curve = curve;
    this.baseColor = EDGE_COLORS[curve.side] || EDGE_COLORS[0];
    this.line = null;
    this.rebuild(sceneSetup);
  }

  rebuild(sceneSetup: any): void {
    if (this.line) {
      this.remove(this.line);
      if (this.line.geometry) this.line.geometry.dispose();
      if (this.line.material) this.line.material.dispose();
    }

    const cps = this.curve.cp.map(c => c.vertex.position);
    const pts = tessellateCubicBezier(cps, EDGE_SEGMENTS);

    const ScalableLine = require('scene/objects/scalableLine').default;
    this.line = new ScalableLine(sceneSetup, pts, EDGE_WIDTH, this.baseColor);
    this.line.material.depthTest = false;
    this.line.material.transparent = true;
    this.line.material.opacity = 0.9;
    this.line.renderOrder = 1;
    this.add(this.line);
  }

  private applyColor(color: number): void {
    if (this.line && this.line.material) {
      this.line.material.color.setHex(color);
    }
  }

  protected onHoverChanged(hover: boolean): void {
    if (!this._selected) {
      this.applyColor(hover ? EDGE_HOVER_COLOR : this.baseColor);
    }
  }

  protected onSelectedChanged(selected: boolean): void {
    this.applyColor(selected ? EDGE_SELECTED_COLOR : this.baseColor);
  }

  protected onDispose(): void {
    if (this.line) {
      if (this.line.geometry) this.line.geometry.dispose();
      if (this.line.material) this.line.material.dispose();
    }
  }
}
