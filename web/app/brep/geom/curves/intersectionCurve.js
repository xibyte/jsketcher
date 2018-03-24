import {TOLERANCE} from '../tolerance';
import {surfaceClosestParam} from '../impl/nurbs-ext';
import * as vec from '../../../math/vec';
import CubicHermiteInterpolation from './cubicHermiteIntepolation';

export class IntersectionCurve {

  constructor(exactPoints, surfaceA, surfaceB) {

    let tangents = [];
    for (let pt of exactPoints) {
      let tangent = curveSSTangent(pt, surfaceA, surfaceB);
      tangents.push(vec._normalize(tangent));
    }
    
    this.surfaceA = surfaceA;
    this.surfaceB = surfaceB;
    this.approx = new CubicHermiteInterpolation(exactPoints, tangents);
    
    this.exactify = (pt) => {
      let uvA = surfaceClosestParam(surfaceA, pt);
      let uvB = surfaceClosestParam(surfaceB, pt);
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surfaceA,surfaceB,uvA,uvB,TOLERANCE).point;
    }    
  }
  
  domain() { 
    return this.approx.domain();
  }

  eval(u, num) { 
    let pt = this.point(u);

    // let [uA, vA] = surfaceClosestParam(this.surfaceA, pt);
    // let [uB, vB] = surfaceClosestParam(this.surfaceB, pt);

    let out = [];
    let approxEval = this.approx.eval(u, num);
    for (let i = 0; i < num + 1; ++i) {
      if (i === 0) {
        out.push(pt);
      } else {
        // let nA = vec.cross(dA[i][0], dA[0][i]);
        // let nB = vec.cross(dB[i][0], dB[0][i]);
        // out.push(vec.cross(nA, nB));

        out[i] = approxEval[i];
      }
    }
    return out;
  }

  point(u) {
    let pt = this.approx.point(u);
    return this.exactify(pt);
  }

  param(point) {
    let pointOnCurve = this.exactify(point);
    return this.approx.param(pointOnCurve);
  }

  knots() { 
    return this.approx.knots();
  }

  degree() {
    return undefined;
  }

  transform(tr) {
    throw 'unsupported;'
  }

  invert() {
    throw 'unsupported;'
  }
}

function curveSSTangent(pt, surfaceA, surfaceB) {
  let [uA, vA] = surfaceClosestParam(surfaceA, pt);
  let [uB, vB] = surfaceClosestParam(surfaceB, pt);

  let dA = verb.eval.Eval.rationalSurfaceDerivatives(surfaceA, uA, vA, 1);
  let dB = verb.eval.Eval.rationalSurfaceDerivatives(surfaceB, uB, vB, 1);

  let nA = vec.cross(dA[1][0], dA[0][1]);
  let nB = vec.cross(dB[1][0], dB[0][1]);
  return vec.cross(nA, nB);
}