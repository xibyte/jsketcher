import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import type {SurfacingContext} from '../../SurfacingContext';

/**
 * An independent NURBS curve (not bound to a surface).
 */
export class NurbsCurve extends GeometricEntity {

  cp: ControlPoint[];

  constructor(ctx: SurfacingContext, cp: ControlPoint[]) {
    super(ctx, generateEntityId('C'));
    this.cp = cp;
  }

  /** Evaluate as cubic Bézier (assumes 4 control points) */
  eval(t: number): Vec3 {
    if (this.cp.length !== 4) throw new Error('NurbsCurve.eval requires exactly 4 control points');
    const mt = 1 - t;
    const p0 = this.cp[0].position;
    const p1 = this.cp[1].position;
    const p2 = this.cp[2].position;
    const p3 = this.cp[3].position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }
}
