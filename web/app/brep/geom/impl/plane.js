import {Surface} from '../surface'
import {Point} from '../point'
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
    return BasisForPlane(this.normal);
  }
  
  basis() {
    if (!this._basis) {
      this._basis = this.calculateBasis();
    }
    return this._basis;
  }
  
  intersect(other) {
    if (other instanceof Plane) {
      return new Line.fromTwoPlanesIntersection(this, other);
    }
    return super.intersect();
  }

  translate(vector) {
    return new Plane(this.normal, this.normal.dot(this.normal.multiply(this.w)._plus(vector)));
  }

  invert() {
    return new Plane(this.normal.multiply(-1), - this.w);
  }

  get2DTransformation() {
    if (!this.__2dTr) {
      this.__2dTr = this.get3DTransformation().invert(); 
    }
    return this.__2dTr;
  }

  get3DTransformation() {
    if (!this.__3dTr) {
      this.__3dTr = new Matrix3().setBasis(this.basis());
    }
    return this.__3dTr;
  }

  coplanarUnsigned(other, tol) {
    return other instanceof Plane && 
      math.areVectorsEqual(this.normal.multiply(this.w), other.normal.multiply(other.w), tol);
    //TODO: store this.normal.multiply(this.w) in a field since it's constant value
  }

  equals(other, tol) {
    return other instanceof Plane &&
      math.areVectorsEqual(this.normal, other.normal, tol) &&
      math.areEqual(this.w, other.w, tol);
  }

  toParametricForm() {
    if (!this.__parametricForm) {
      const basis = BasisForPlane(this.normal);
      this.__parametricForm = new ParametricPlane(this.normal.multiply(this.w), basis.x, basis.y);
    }
    return this.__parametricForm;
  }
  
  toUV(point) {
    return this.get2DTransformation().apply(point);
  }

  fromUV(u, v) {
    return this.get3DTransformation()._apply(new Point(u, v, 0));
  }

  domainU() {
    return [Number.MIN_VALUE, Number.MAX_VALUE];
  }
  
  domainV() {
    return [Number.MIN_VALUE, Number.MAX_VALUE];
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