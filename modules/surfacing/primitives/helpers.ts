import {Vertex} from '../models/Scene/Scene.entity';
import {lerp as vlerp} from 'math/vec';

export function V(x: number, y: number, z: number): Vertex {
  return new Vertex(x, y, z);
}

/** Linear interpolation between two Vertex, creating a new one */
export function Vlerp(a: Vertex, b: Vertex, t: number): Vertex {
  const p = vlerp(a.position, b.position, t);
  return new Vertex(p[0], p[1], p[2]);
}
