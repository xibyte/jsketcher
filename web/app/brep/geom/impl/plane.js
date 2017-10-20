import {Surface} from '../surface'
import {Point} from '../point'
import {Line} from './line'
import {Matrix3, AXIS, BasisForPlane} from  '../../../math/l3space'
import {eqTol, veq} from "../tolerance";

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

  intersectForSameClass(other) {
    return new Line.fromTwoPlanesIntersection(this, other);
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
      const basis = new Matrix3().setBasis(this.basis());
      const translate = new Matrix3();
      translate.tz = this.w
      this.__3dTr = basis.combine(translate);
//      this.__3dTr.tz = this.w;
    }
    return this.__3dTr;
  }

  coplanarUnsignedForSameClass(other) {
    return veq(this.normal.multiply(this.w), other.normal.multiply(other.w));
  }

  equalsForSameClass(other) {
    return veq(this.normal, other.normal) &&
           eqTol(this.w, other.w);
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

Plane.prototype.isPlane = true;

Plane.XY = new Plane(AXIS.Z, 0);
Plane.XZ = new Plane(AXIS.Y, 0);
Plane.YZ = new Plane(AXIS.X, 0);

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
