import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';

/**
 * A 3D point shared by identity across surfaces for watertight topology.
 * Moving a Vertex automatically updates all surfaces that reference it.
 */
export class Vertex extends GeometricEntity {

  position: Vec3;

  constructor(x: number, y: number, z: number) {
    super(generateEntityId('V'));
    this.position = [x, y, z];
  }

  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
  }
}
