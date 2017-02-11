import {Surface} from '../surface'
import {Line} from './line'
import {Matrix3, AXIS, BasisForPlane} from  '../../../math/l3space'
import * as math from  '../../../math/math'
 
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
  
  intersect(other) {
    if (other instanceof Plane) {
      return new Line.fromTwoPlanesIntersection(this, other);
    }
    return super.intersect();
  }
  
  invert() {
    return new Plane(this.normal.multiply(-1), - this.w);
  }

  get2DTransformation() {
    return this.get3DTransformation().invert();
  }

  get3DTransformation() {
    return new Matrix3().setBasis(this.calculateBasis());
  }

  coplanarUnsigned(other, tol) {
    return other instanceof Plane && 
      math.areVectorsEqual(this.normal.multiply(this.w), other.normal.multiply(other.w), tol);
    //TODO: store this.normal.multiply(this.w) in a field since it's constant value
  }

  toParametricForm() {
    const basis = BasisForPlane(this.normal);
    return new ParametricPlane(this.normal.multiply(this.w), basis.x, basis.y);
  }
}

class ParametricPlane {

  constructor(r0, r1, r2) {
    this.r0 = r0;
    this.r1 = r1;
    this.r2 = r2;
  }

  equation(u, v) {
    return this.r0 + this.r1.multiply(u) + this.r2.multiply(v);
  }
}