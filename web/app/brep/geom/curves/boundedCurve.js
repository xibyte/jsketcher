import * as vec from 'math/vec';
import InvertedCurve from './invertedCurve';

export default class BoundedCurve {

  constructor(curve, boundA, boundB) {
    this.curve = curve;
    this.boundA = boundA;
    this.boundB = boundB;
    this.knots = [boundA];
    curve.knots().forEach(u => u > boundA && u < boundB && this.knots.push(u));
    this.knots.push(boundB);
  }

  boundParam(u) {
    return Math.min(this.boundB, Math.max(this.boundA, u));
  }
  
  domain() {
    return [this.boundA, this.boundB];
  }

  degree() {
    return this.curve.degree();
  }

  transform(tr) {
    return new BoundedCurve(this.curve.transform(tr), this.boundA, this.boundB);
  }

  point(u) {
    return this.curve.point(this.boundParam(u));
  }

  param(point) {
    return this.boundParam(this.curve.param(point));
  }

  eval(u, num) {
    let res = this.curve.eval(this.boundParam(u), num);
    if (res.length > 1) {
      vec._negate(res[1])
    }
    return eval;

  }

  knots() {
    return this.knots;
  }

  invert() {
    return new InvertedCurve(this.curve);
  }

  split(u) {
    return [
      new BoundedCurve(this.curve, this.boundA, u),
      new BoundedCurve(this.curve, u, this.boundB)
    ];
  }
  
  static splitCurve(curve, u) {
    let [uMin, uMax] = curve.domain();
    return [
      new BoundedCurve(curve, uMin, u),
      new BoundedCurve(curve, u, uMax)
    ];
  }
}
