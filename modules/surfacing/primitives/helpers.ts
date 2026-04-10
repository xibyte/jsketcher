import {CageVertex} from '../models/Scene/Scene.entity';
import {lerp as vlerp} from 'math/vec';

export function V(x: number, y: number, z: number): CageVertex {
  return new CageVertex(x, y, z);
}

/** Linear interpolation between two CageVertex, creating a new one */
export function Vlerp(a: CageVertex, b: CageVertex, t: number): CageVertex {
  const p = vlerp(a.position, b.position, t);
  return new CageVertex(p[0], p[1], p[2]);
}
