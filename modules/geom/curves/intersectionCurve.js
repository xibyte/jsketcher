import {TOLERANCE, veq3} from '../tolerance';
import {surfaceClosestParam} from '../impl/nurbs-ext';
import * as vec from 'math/vec';
import CubicHermiteInterpolation from './cubicHermiteIntepolation';
import InvertedCurve from './invertedCurve';
import {genericCurveSplit} from './boundedCurve';
import BoundedCurve from './boundedCurve';

export class IntersectionCurve {

  constructor(exactPoints, surfaceA, surfaceB) {

    fixDirection(exactPoints, surfaceA, surfaceB);
    
    let tangents = [];
    for (let i = 0; i < exactPoints.length; i++) {
      let pt = exactPoints[i];
      let auxInverse = i === exactPoints.length - 1;
      let auxPt = auxInverse ? exactPoints[i - 1] : exactPoints[i + 1];
      let tangent = curveSSTangent(pt, surfaceA, surfaceB, auxPt, auxInverse);
      tangents.push(tangent);
    }
    
    this.surfaceA = surfaceA;
    this.surfaceB = surfaceB;
    this.approx = new CubicHermiteInterpolation(exactPoints, tangents);
    
    this.exactify = (pt) => {
      let uvA = surfaceClosestParam(surfaceA, pt);
      let uvB = surfaceClosestParam(surfaceB, pt);
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surfaceA,surfaceB,uvA,uvB,TOLERANCE).point;
    };    
    
    // __DEBUG__.Clear();
    exactPoints.forEach(__DEBUG__.AddPoint3);
    this.debug();
    console.log(exactPoints);
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
    // let pointOnCurve = this.exactify(point);
    return this.approx.param(point);
  }

  knots() { 
    return this.approx.knots();
  }

  degree() {
    return undefined;
  }

  transform(tr) {
    throw 'unsupported;'
    // return new IntersectionCurve(this.approx.points.map(p => vec.dotVM(p, tr)), this.surfaceA, this.surfaceB);
  }

  invert() {
    return new InvertedCurve(this);
  }
  
  split(u) {
    return BoundedCurve.splitCurve(this, u);  
  }
  
  debug() {
    __DEBUG__.AddParametricCurve(this.approx, 0xff0000, 10);
    __DEBUG__.AddParametricCurve(this, 0xffffff, 10);
    __DEBUG__.AddPolyLine3(this.approx.knots().map(u => this.approx.point(u)));
  }
}

function curveSSTangent(pt, surfaceA, surfaceB, auxPt, auxInverse) {
  let [uA, vA] = surfaceClosestParam(surfaceA, pt);
  let [uB, vB] = surfaceClosestParam(surfaceB, pt);

  let dA = verb.eval.Eval.rationalSurfaceDerivatives(surfaceA, uA, vA, 1);
  let dB = verb.eval.Eval.rationalSurfaceDerivatives(surfaceB, uB, vB, 1);

  let nA = vec.normalize(vec.cross(dA[1][0], dA[0][1]));
  let nB = vec.normalize(vec.cross(dB[1][0], dB[0][1]));

  if (veq3(nA, nB)) {
    let segV = vec.sub(auxPt, pt);
    let dV = vec.mul(nA, - vec.dot(nA, segV));
    let projectionOntoTangentPlane = vec._add(dV, auxPt);
    if (auxInverse) {
      vec._negate(projectionOntoTangentPlane);
    }
    let estimatedTangent = vec._normalize(vec._sub(projectionOntoTangentPlane, pt));
    return estimatedTangent;
  } else {
    return vec._normalize(vec.cross(nA, nB));
  }
}

function fixDirection(points, surfaceA, surfaceB) {
  for (let i = 0; i < points.length; i++) {
    let pt  = points[i];

    let [uA, vA] = surfaceClosestParam(surfaceA, pt);
    let [uB, vB] = surfaceClosestParam(surfaceB, pt);

    let dA = verb.eval.Eval.rationalSurfaceDerivatives(surfaceA, uA, vA, 1);
    let dB = verb.eval.Eval.rationalSurfaceDerivatives(surfaceB, uB, vB, 1);

    let nA = vec.normalize(vec.cross(dA[1][0], dA[0][1]));
    let nB = vec.normalize(vec.cross(dB[1][0], dB[0][1]));

    if (!veq3(nA, nB)) {
      let tangent = vec._normalize((vec.cross(nA, nB)));
      let auxInverse = i === points.length - 1;
      let auxPt = auxInverse ? points[i - 1] : points[i + 1];

      let segV = vec.sub(auxPt, pt);
      let dV = vec.mul(nA, - vec.dot(nA, segV));
      let projectionOntoTangentPlane = vec._add(dV, auxPt);
      if (auxInverse) {
        vec._negate(projectionOntoTangentPlane);
      }
      let estimatedTangent = vec._normalize(vec._sub(projectionOntoTangentPlane, pt));
      if (vec.dot(tangent, estimatedTangent) < 0) {
        points.reverse();
      }
      return;
    }
  }
}
