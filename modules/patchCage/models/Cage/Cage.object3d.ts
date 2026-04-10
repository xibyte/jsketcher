import {Group, BufferGeometry, BufferAttribute, LineBasicMaterial, Line} from 'three';
import type {Cage} from './Cage.entity';

const CAGE_LINE_COLOR = 0x1a1a1a;

/**
 * Three.js Object3D for a Cage entity.
 * Renders the 4×4 control point grid as line segments.
 */
export class CageObject3D extends Group {

  constructor(cage: Cage) {
    super();
    this.rebuild(cage);
  }

  rebuild(cage: Cage): void {
    // Clear existing
    while (this.children.length > 0) {
      const c = this.children[0];
      this.remove(c);
      if ((c as any).geometry) (c as any).geometry.dispose();
    }

    const lineMat = new LineBasicMaterial({
      color: CAGE_LINE_COLOR,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
    lineMat.depthWrite = false;

    for (const seg of cage.segments) {
      const pa = seg.a.vertex.position;
      const pb = seg.b.vertex.position;
      const pts = new Float32Array([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]]);
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      this.add(new Line(g, lineMat));
    }
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
