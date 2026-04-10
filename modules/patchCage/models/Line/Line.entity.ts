import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';

/**
 * A line segment between two control points, used in cage visualization.
 */
export class Line extends GeometricEntity {

  a: ControlPoint;
  b: ControlPoint;

  constructor(a: ControlPoint, b: ControlPoint) {
    super(generateEntityId('L'));
    this.a = a;
    this.b = b;
  }
}
