import {ControlPoint} from '../models/ControlPoint/ControlPoint.entity';
import {lerp as vlerp} from 'math/vec';
import type {SurfacingEditor} from '../SurfacingEditor';

/** Build a grid-ready ControlPoint (which IS a Vertex via inheritance). */
export function V(ctx: SurfacingEditor, x: number, y: number, z: number): ControlPoint {
  return new ControlPoint(ctx, x, y, z);
}

/** Linear interpolation between two grid points, returning a fresh CP. */
export function Vlerp(ctx: SurfacingEditor, a: ControlPoint, b: ControlPoint, t: number): ControlPoint {
  const p = vlerp(a.position, b.position, t);
  return new ControlPoint(ctx, p[0], p[1], p[2]);
}
