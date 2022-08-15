import {Point} from '../point';
import {Line} from './line';
import {eqTol, veq} from '../tolerance';
import {Matrix3x4} from 'math/matrix';
import {BasisForPlane} from 'math/basis';
import Vector, {AXIS, UnitVector} from "math/vector";


export class Plane {
  normal: UnitVector;
  w: number;
  #basis: any;
  #_2dTr: any;
  #_3dTr: any;
  #parametricForm: any;

  static XY = new Plane(AXIS.Z, 0);
  static XZ = new Plane(AXIS.Y, 0);
  static YZ = new Plane(AXIS.X, 0);

  static by3Points(a: Vector, b: Vector, c: Vector): Plane {
    const ab = b.minus(a);
    const ac = c.minus(a);
    const n = ab.cross(ac)._normalize();
    const w = a.dot(n);
    return new Plane(n, w);
  }

  constructor(normal: UnitVector, w: number) {
    this.normal = normal;
    this.w = w;
  }

  calculateBasis() {
    return BasisForPlane(this.normal);
  }

  basis() {
    if (!this.#basis) {
      this.#basis = this.calculateBasis();
    }
    return this.#basis;
  }

  intersectForSameClass(other) {
    return Line.fromTwoPlanesIntersection(this, other);
  }

  translate(vector) {
    return new Plane(this.normal, this.normal.dot(this.normal.multiply(this.w)._plus(vector)));
  }

  invert() {
    return new Plane(this.normal.multiply(-1) as UnitVector, - this.w);
  }

  get2DTransformation() {
    if (!this.#_2dTr) {
      this.#_2dTr = this.get3DTransformation().invert();
    }
    return this.#_2dTr;
  }

  get3DTransformation() {
    if (!this.#_3dTr) {
      const basis = new Matrix3x4().setBasis(this.basis());
      const translate = new Matrix3x4();
      translate.tz = this.w;
      this.#_3dTr = basis.combine(translate);
//      this.#_3dTr.tz = this.w;
    }
    return this.#_3dTr;
  }

  coplanarUnsigned(other) {
    return veq(this.normal.multiply(this.w), other.normal.multiply(other.w));
  }

  equalsForSameClass(other) {
    return veq(this.normal, other.normal) &&
           eqTol(this.w, other.w);
  }

  toParametricForm() {
    if (!this.#parametricForm) {
      const [x, y, z] = BasisForPlane(this.normal);
      this.#parametricForm = new ParametricPlane(this.normal.multiply(this.w), x, y);
    }
    return this.#parametricForm;
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

  tangentPlane() {
    return this;
  }

  middle() {
    return [0, 0]
  }
}

Plane.prototype.TYPE = 'plane';
Plane.prototype.isPlane = true;

class ParametricPlane {

  r0: any;
  r1: any;
  r2: any;

  constructor(r0, r1, r2) {
    this.r0 = r0;
    this.r1 = r1;
    this.r2 = r2;
  }

  equation(u, v) {
    return this.r0 + this.r1.multiply(u) + this.r2.multiply(v);
  }
}


declare module './plane' {
  interface Plane {

    TYPE: string;

    isPlane: boolean;

  }
}