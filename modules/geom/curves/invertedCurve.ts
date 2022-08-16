import * as vec from 'math/vec';
import {ParametricCurve} from "./parametricCurve";

export default class InvertedCurve implements ParametricCurve {

  curve: ParametricCurve;
  uMin: number;
  uMax: number;

  constructor(curve: ParametricCurve) {
    this.curve = curve;
    const [uMin, uMax] = this.curve.domain();
    this.uMin = uMin;
    this.uMax = uMax;
  }

  wrapParam(u) {
    return this.uMax - (u - this.uMin);
  }
  
  domain() {
    return this.curve.domain();
  }

  degree() {
    return this.curve.degree();
  }

  transform(tr) {
    return new InvertedCurve(this.curve.transform(tr));
  }

  point(u) {
    return this.curve.point(this.wrapParam(u));
  }

  param(point) {
    return this.wrapParam(this.curve.param(point));
  }

  eval(u, num) {
    const res = this.curve.eval(this.wrapParam(u), num);
    if (res.length > 1) {
      vec._negate(res[1]) 
    }
    return res;
    
  }

  knots() {
    return this.curve.knots();
  }

  invert() {
    return this.curve;
  }

  split(u: number): [ParametricCurve, ParametricCurve] {
    const invertedCurves = this.curve.split(this.wrapParam(u)).map(c => new InvertedCurve(c)).reverse();
    return invertedCurves as any;
  }
}
