import {BufferGeometry, Line} from 'three';
import type {NurbsCurve} from './NurbsCurve.entity';
import {
  EntityObject3D,
  buildPolylineGeometry,
  createCurveMaterial,
  CURVE_COLOR,
} from '../../three';

const CURVE_SEGMENTS = 24;

/**
 * Three.js visual for an independent NurbsCurve entity.
 */
export class NurbsCurveObject3D extends EntityObject3D {

  private geometry: BufferGeometry | null = null;
  private material = createCurveMaterial(CURVE_COLOR);
  private line: Line | null = null;

  constructor(curve: NurbsCurve) {
    super();
    this.rebuild(curve);
  }

  rebuild(curve: NurbsCurve): void {
    this.clearLine();

    const pts: number[] = [];
    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      const p = curve.eval(i / CURVE_SEGMENTS);
      pts.push(p[0], p[1], p[2]);
    }

    this.geometry = buildPolylineGeometry(pts);
    this.line = new Line(this.geometry, this.material);
    this.add(this.line);
  }

  private clearLine(): void {
    if (this.line) {
      this.remove(this.line);
      this.line = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
  }

  protected onDispose(): void {
    this.clearLine();
    this.material.dispose();
  }
}
