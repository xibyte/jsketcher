import {GeometricEntity} from '../GeometricEntity';
import type {SurfacingEditor} from '../../SurfacingEditor';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';

/**
 * A line segment between two control points, used in cage visualization.
 */
export class Line extends GeometricEntity {

  a: ControlPoint;
  b: ControlPoint;

  constructor(ctx: SurfacingEditor, a: ControlPoint, b: ControlPoint) {
    super(ctx, ctx.nextId('L'));
    this.a = a;
    this.b = b;
  }
}
