import {Surface} from '../surface'
import {AXIS} from  '../../../math/l3space'
 
export class Plane extends Surface {

  constructor(normal, w) {
    super();
    this.normal = normal;
    this.w = w;
  }

  calculateBasis() {
    const normal = this.normal;
    let alignPlane, x, y;
    if (Math.abs(normal.dot(AXIS.Y)) < 0.5) {
      alignPlane = normal.cross(AXIS.Y);
    } else {
      alignPlane = normal.cross(AXIS.Z);
    }
    y = alignPlane.cross(normal);
    x = y.cross(normal);
    return [x, y, normal];
  }
}