import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';

/**
 * A 3D point shared by identity across surfaces for watertight topology.
 * Moving a Vertex automatically notifies every NurbsSurface that references
 * it so each one can invalidate its own visual — no central controller.
 */
export class Vertex extends GeometricEntity {

  position: Vec3;
  /** Back-references to surfaces that include this vertex in their 4×4 grid. */
  readonly usedBy: Set<NurbsSurface> = new Set();

  constructor(x: number, y: number, z: number, id?: string) {
    super(id ?? generateEntityId('V'));
    this.position = [x, y, z];
  }

  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    // Notify every dependent surface — they schedule their own visual rebuild.
    for (const surface of this.usedBy) surface.invalidateVisual();
  }
}
