import {BufferGeometry, BufferAttribute, Line} from 'three';
import type {Cage} from './Cage.entity';
import {
  EntityObject3D,
  createCageLineMaterial,
} from '../../three';

/**
 * Three.js visual for a Cage entity — the 4×4 control-point grid rendered
 * as line segments connecting adjacent CPs.
 */
export class CageObject3D extends EntityObject3D {

  private material = createCageLineMaterial();

  constructor(cage: Cage) {
    super();
    this.rebuild(cage);
  }

  rebuild(cage: Cage): void {
    this.clearLines();

    for (const seg of cage.segments) {
      const pa = seg.a.vertex.position;
      const pb = seg.b.vertex.position;
      const pts = new Float32Array([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]]);
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      this.add(new Line(g, this.material));
    }
  }

  private clearLines(): void {
    while (this.children.length > 0) {
      const c = this.children[0];
      this.remove(c);
      if ((c as any).geometry) (c as any).geometry.dispose();
    }
  }

  isSelectable(): boolean {
    return false;
  }

  protected onDispose(): void {
    this.clearLines();
    this.material.dispose();
  }
}
