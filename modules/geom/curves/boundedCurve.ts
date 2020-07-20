import InvertedCurve from './invertedCurve';
import {ParametricCurve} from "./parametricCurve";
import {Matrix3x4Data} from "math/matrix";

export default class BoundedCurve implements ParametricCurve {

  curve: ParametricCurve;
  boundA: number;
  boundB: number;
  _knots: number[];

  constructor(curve, boundA, boundB) {
    this.curve = curve;
    this.boundA = boundA;
    this.boundB = boundB;

    this._knots = [boundA];
    curve.knots().forEach(u => u > boundA && u < boundB && this._knots.push(u));
    this._knots.push(boundB);
  }

  boundParam(u) {
    return Math.min(this.boundB, Math.max(this.boundA, u));
  }
  
  domain(): [number, number] {
    return [this.boundA, this.boundB];
  }

  degree() {
    return this.curve.degree();
  }

  transform(tr: Matrix3x4Data): ParametricCurve {
    return new BoundedCurve(this.curve.transform(tr), this.boundA, this.boundB);
  }

  point(u) {
    return this.curve.point(this.boundParam(u));
  }

  param(point) {
    return this.boundParam(this.curve.param(point));
  }

  eval(u, num) {
    return this.curve.eval(this.boundParam(u), num);
  }

  knots() {
    return this._knots;
  }

  invert() {
    return new InvertedCurve(this.curve);
  }

  split(u) {
    return [
      new BoundedCurve(this.curve, this.boundA, u),
      new BoundedCurve(this.curve, u, this.boundB)
    ] as [ParametricCurve, ParametricCurve];
  }
  
  static splitCurve(curve, u): [BoundedCurve, BoundedCurve] {
    let [uMin, uMax] = curve.domain();
    return [
      new BoundedCurve(curve, uMin, u),
      new BoundedCurve(curve, u, uMax)
    ];
  }
}
