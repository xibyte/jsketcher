import {BufferGeometry, BufferAttribute, Line} from 'three';
import type {Cage} from './Cage.entity';
import {
  EntityObject3D,
  createCageLineMaterial,
} from '../../three';

/**
 * Three.js visual for a Cage entity — the 4×4 control-point grid rendered
 * as line segments. Default-hidden; the scene flips `.visible = true` when
 * the owning surface is selected. ControlPoint handles are NOT children of
 * the cage — they live in a scene-level pool (one per Vertex) because
 * boundary CPs are shared between adjacent surfaces.
 */
export class CageObject3D extends EntityObject3D {

  readonly cage: Cage;
  private material = createCageLineMaterial();
  private lines: Line[] = [];

  constructor(cage: Cage) {
    super();
    this.cage = cage;
    this.visible = false;
    this.rebuild();
  }

  /**
   * Rebuild every line's geometry from the current vertex positions.
   * Called on construction and after structural changes (split/subdivide).
   */
  rebuild(): void {
    this.clearLines();

    for (const seg of this.cage.segments) {
      const pa = seg.a.position;
      const pb = seg.b.position;
      const pts = new Float32Array([
        pa[0], pa[1], pa[2],
        pb[0], pb[1], pb[2],
      ]);
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      const line = new Line(g, this.material);
      line.renderOrder = 1;
      (line as any).raycast = () => {};  // cage lines are not pickable
      this.add(line);
      this.lines.push(line);
    }
  }

  /**
   * In-place update of every line's endpoints from the current vertex
   * positions. Called from the drag path so the cage follows CP handles
   * without reallocating geometries.
   */
  sync(): void {
    for (let i = 0; i < this.lines.length; i++) {
      const seg = this.cage.segments[i];
      if (!seg) continue;
      const pa = seg.a.position;
      const pb = seg.b.position;
      const attr = this.lines[i].geometry.getAttribute('position') as BufferAttribute;
      const arr = attr.array as Float32Array;
      arr[0] = pa[0]; arr[1] = pa[1]; arr[2] = pa[2];
      arr[3] = pb[0]; arr[4] = pb[1]; arr[5] = pb[2];
      attr.needsUpdate = true;
    }
  }

  private clearLines(): void {
    for (const line of this.lines) {
      this.remove(line);
      line.geometry.dispose();
    }
    this.lines.length = 0;
  }

  protected onDispose(): void {
    this.clearLines();
    this.material.dispose();
  }
}
