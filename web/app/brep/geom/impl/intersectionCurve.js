import {TOLERANCE} from '../tolerance';
import {curveClosestParam, curveDomain, curvePoint, surfaceClosestParam} from './nurbs-ext';
import * as vec from "../../../math/vec";

export class IntersectionCurve {

  constructor(approxPolyline, surfaceA, surfaceB) {
    this.surfaceA = surfaceA;
    this.surfaceB = surfaceB;
    this.approxPolyline = approxPolyline;
    this.exactify = (pt) => {
      let uvA = surfaceClosestParam(surfaceA, pt);
      let uvB = surfaceClosestParam(surfaceB, pt);
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surfaceA,surfaceB,uvA,uvB,TOLERANCE).point;
    }    
  }
  
  domain() { 
    return curveDomain(this.approxPolyline);
  }

  eval(u, num) { 
    let pt = this.point(u);

    let [uA, vA] = surfaceClosestParam(this.surfaceA, pt);
    let [uB, vB] = surfaceClosestParam(this.surfaceB, pt);

    let dA = verb.eval.Eval.rationalSurfaceDerivatives(this.surfaceA, uA, vA, num);
    let dB = verb.eval.Eval.rationalSurfaceDerivatives(this.surfaceB, uB, vB, num);
    
    let out = [];
    for (let i = 0; i < num + 1; ++i) {
      if (i === 0) {
        out.push(pt);
      } else {
        let nA = vec.cross(dA[i][0], dA[0][i]);
        let nB = vec.cross(dB[i][0], dB[0][i]);
        out.push(vec.cross(nA, nB));
      }
    }
    return out;
  }

  point(u) {
    let pt = curvePoint(this.approxPolyline, u);
    return this.exactify(pt);
  }

  param(point) {
    let pointOnCurve = this.exactify(point);
    return curveClosestParam(this.approxPolyline, pointOnCurve);
  }

  optimalSplits() { 
    return this.approxPolyline.knots.length - 3;
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