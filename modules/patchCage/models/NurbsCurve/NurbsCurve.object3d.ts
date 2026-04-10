import {Group, BufferGeometry, BufferAttribute, LineBasicMaterial, Line} from 'three';
import type {NurbsCurve} from './NurbsCurve.entity';

const CURVE_COLOR = 0x44aaff;
const CURVE_SEGMENTS = 24;

/**
 * Three.js Object3D for an independent NurbsCurve entity.
 */
export class NurbsCurveObject3D extends Group {

  constructor(curve: NurbsCurve) {
    super();
    this.rebuild(curve);
  }

  rebuild(curve: NurbsCurve): void {
    while (this.children.length > 0) {
      const c = this.children[0];
      this.remove(c);
    }

    const pts: number[] = [];
    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      const p = curve.eval(i / CURVE_SEGMENTS);
      pts.push(p[0], p[1], p[2]);
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const mat = new LineBasicMaterial({color: CURVE_COLOR});
    this.add(new Line(g, mat));
  }

  dispose(): void {
    while (this.children.length > 0) {
      const c = this.children[0];
      this.remove(c);
      if ((c as any).geometry) (c as any).geometry.dispose();
      if ((c as any).material) (c as any).material.dispose();
    }
  }
}
