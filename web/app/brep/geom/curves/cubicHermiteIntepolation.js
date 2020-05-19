import * as vec from 'math/vec';
import {cubicBezierDer1, cubicBezierDer2, cubicBezierPoint} from './bezierCubic';
import {closestToCurveParam} from './closestPoint';
import InvertedCurve from './invertedCurve';

export default function CubicHermiteInterpolation(points, tangents) {
  let n = points.length;
  let knots = new Array(n).fill().map((e,i) => i);
  let beziers = [];
  for (let i = 1; i < n; i++) {
    let p0 = points[i - 1];
    let p3 = points[i];
    let tangent1 = tangents[i - 1];
    let tangent2 = tangents[i];
    let length = vec.length(vec.sub(p3, p0)) * 0.5;
    let p1 = vec.add(p0, vec.mul(tangent1, length));
    let p2 = vec.sub(p3, vec.mul(tangent2, length));
    beziers.push({p0, p1, p2, p3});
  }

  function evalPatch(p0, p1, p2, p3, u, num) {
    switch (num) {
      case 0: return cubicBezierPoint(p0, p1, p2, p3, u);
      case 1: return cubicBezierDer1(p0, p1, p2, p3, u);
      case 2: return cubicBezierDer2(p0, p1, p2, p3, u);
      default: throw 'illegal derivative order for cubic bezier curve';
    }
  }
  
  function localizeParam(u) {
    let pieceIndex;
    if (u >= n - 1) {
      pieceIndex = beziers.length - 1;
      u = 1;
    } else {
      pieceIndex = Math.floor(u);
      u = u % 1;
    }
    if (!beziers[pieceIndex]) {
      throw 'parameter out of bounds: ' + u;
    }
    return [pieceIndex, u];
  }
  
  function evaluate(u, num) {
    let [pieceIndex, uL] = localizeParam(u);
    let {p0, p1, p2, p3} = beziers[pieceIndex];
    let out = [];
    for (let i = 0; i <= num; ++i) {
      out.push(evalPatch(p0, p1, p2, p3, uL, i));
    }
    return out;
  }

  function point(u) {
    let [pieceIndex, uL] = localizeParam(u);
    let {p0, p1, p2, p3} = beziers[pieceIndex];
    return cubicBezierPoint(p0, p1, p2, p3, uL);
  }
  
  function param(point) {
    return closestToCurveParam(this, point);
  }

  function transform(tr) {
    return new CubicHermiteInterpolation(
      points.map(p => vec.dotVM(p, tr)), 
      tangents.map(p => vec.dotVM(p, tr)));
  }
  
  function invert() {
    return new InvertedCurve(this);
  }

  Object.assign(this, {
    domain: () => [0, n - 1],
    degree: () => 3,
    eval: evaluate,
    point,
    param,
    transform,
    knots: () => knots,
    invert,
    points, tangents
  });
}
