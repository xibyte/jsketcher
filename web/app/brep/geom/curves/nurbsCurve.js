import * as ext from '../impl/nurbs-ext';
import {newVerbCurve} from "../impl/nurbs";


export default class NurbsCurve { 

  constructor(verbCurve) {
    this.verb = verbCurve;
    this.data = verbCurve.asNurbs();
  }

  domain() {
    return ext.curveDomain(this.data);
  }

  degree1Tess() {
    return ext.distinctKnots(this.data);
  }

  degree() {
    return this.data.degree;
  }

  transform(tr) {
    return new NurbsCurve(this.verb.transform(tr));
  }

  point(u) {
    return this.verb.point(u);
  }

  param(point) {
    return this.verb.closestParam(point);
  }

  eval(u, num) {
    return verb.eval.Eval.rationalCurveDerivatives( this.data, u, num );
  }

  optimalSplits() {
    return this.data.knots.length - 1;
  }

  invert() {

    let inverted = ext.curveInvert(this.data);
    ext.normalizeCurveParametrizationIfNeeded(inverted);
    // let [min, max] = curveDomain(curve);
    // for (let i = 0; i < reversed.knots.length; i++) {
    //   if (eqEps(reversed.knots[i], max)) {
    //     reversed.knots[i] = max;
    //   } else {
    //     break;
    //   }
    // }
    // for (let i = reversed.knots.length - 1; i >= 0 ; i--) {
    //   if (eqEps(reversed.knots[i], min)) {
    //     reversed.knots[i] = min;
    //   } else {
    //     break;
    //   }
    // }

    return new NurbsCurve(newVerbCurve(inverted));
  }

  split(u) {
    let split = verb.eval.Divide.curveSplit(this.data, u);
    split.forEach(n => ext.normalizeCurveParametrization(n));
    return split.map(c => new NurbsCurve(newVerbCurve(c)));
  }
}
