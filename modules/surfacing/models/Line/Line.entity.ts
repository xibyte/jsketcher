import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import type {SurfacingContext} from '../../SurfacingContext';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';

/**
 * A line segment between two control points, used in cage visualization.
 */
export class Line extends GeometricEntity {

  a: ControlPoint;
  b: ControlPoint;

  constructor(ctx: SurfacingContext, a: ControlPoint, b: ControlPoint) {
    super(ctx, generateEntityId('L'));
    this.a = a;
    this.b = b;
  }
}
