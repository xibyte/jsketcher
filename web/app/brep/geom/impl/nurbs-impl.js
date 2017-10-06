import * as vec from "../../../math/vec";
import * as math from  '../../../math/math'
import {TOLERANCE, TOLERANCE_SQ} from '../tolerance';

export function curveStep(curve, u, tessTol, scale) {
  tessTol = tessTol || 1;
  scale = scale || 1;
  let ders = verb.eval.Eval.rationalCurveDerivatives( curve, u, 2 );
  let r1 = ders[1];
  let r2 = ders[2];

  let r1lsq = vec.lengthSq(r1);
  let r1l = Math.sqrt(r1lsq);

  let r = r1lsq * r1l / vec.length(vec.cross(r1, r2));
  let tol = tessTol / scale;

  let step = 2 * Math.sqrt(tol*(2*r -  tol)) / r1l;
  return step;
}

export function curveDomain(curve) {
  return [curve.knots[0], curve.knots[curve.knots.length - 1]];
}

export function curveParts(curve) {
  let out = [curve.knots[0]];
  for (let i = 1; i < curve.knots.length; ++i) {
    if (out[out.length - 1] !== curve.knots[i]) {
      out.push(curve.knots[i]);
    }
  }
  return out;
}

export function curveTessellateToParams(curve, tessTol, scale) {
  let domain = curveDomain(curve);

  if (curve.degree === 1) {
    return domain;
  }

  let [min, max] = domain;

  let out = [];
  let nSplits = curve.knots.length - 1;

  let splitStep = (max - min) / nSplits
  let splits = [min];
  
  for (let i = 1; i < nSplits; ++i) {
    splits.push(i * splitStep);
  }
  splits.push(max);

  function refine(u1, u2, step) {   
    if (step <  u2 - u1) {
      let mid = u1 + (u2 - u1) * 0.5;    
      refine(u1, mid, step);
      out.push(mid);
      refine(mid, u2, curveStep(curve, mid, tessTol, scale));
    }
  }
  for (let i = 1; i < splits.length; ++i) {
    let u1 = splits[i - 1];
    out.push(u1);
    refine(u1, splits[i], curveStep(curve, u1, tessTol, scale));
  }

  out.push(max);
  return out;
  // let out = [];
  // function tessRange(begin, end) {
  //   let u = begin;
  //   while (u < end) {
  //     out.push(u);
  //     u += curveStep(curve, u, tessTol, scale );
  //   }
  // }
  
  // let parts = curveParts(curve);
  // for (let i = 1; i < parts.length; ++i) {
  //   let begin = parts[i - 1];
  //   let end = parts[i];
  //   tessRange(begin, end);
  // }
  // out.push(parts[parts.length - 1]);
  // return out;
}

export function curveTessellate(curve, tessTol, scale) {
  let params = curveTessellateToParams(curve, tessTol, scale);
  let out = [];
  if (params.length === 0) {
    return out;
  }
  out.push(curvePoint(curve, params[0]));

  for (let i = 1; i < params.length; ++i) {
    let p = curvePoint(curve, params[i]);
    if (!math.areVectorsEqual3(out[out.length - 1], p, TOLERANCE)) {
      out.push(p);
    }
  }
  return out;
}

export function curvePoint(curve, u) {
  return verb.eval.Eval.rationalCurvePoint( curve, u );
}

export function curveClosestParam(curve, point) {
  return verb.eval.Analyze.rationalCurveClosestParam(curve, point);
}

export function verb_surface_isec(nurbs1, nurbs2) {
  const surface0 = nurbs1.asNurbs();
  const surface1 = nurbs2.asNurbs();
  const tess1 = verb.eval.Tess.rationalSurfaceAdaptive(surface0);
  const tess2 = verb.eval.Tess.rationalSurfaceAdaptive(surface1);
  const resApprox = verb.eval.Intersect.meshes(tess1,tess2);
  const exactPls = resApprox.map(function(pl) {
    return pl.map(function(inter) {
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surface0,surface1,inter.uv0,inter.uv1,TOLERANCE);
    });
  });
  return exactPls.map(function(x) {
    return verb.eval.Make.rationalInterpCurve(x.map(function(y) {
      return y.point;
    }), x.length - 1);
  }).map(cd => new verb.geom.NurbsCurve(cd));
}

export function verb_curve_isec(curve1, curve2) {

  let result = [];
  let segs1 = curveTessellate(curve1);
  let segs2 = curveTessellate(curve2);

  for (let i = 0; i < segs1.length - 1; i++) {
    let a1 = segs1[i];
    let b1 = segs1[i + 1];
    for (let j = 0; j < segs2.length - 1; j++) {
      let a2 = segs2[j];
      let b2 = segs2[j + 1];

      //TODO: minimize
      let isec = intersectSegs(a1, b1, a2, b2, TOLERANCE);
      if (isec !== null) {
        let {u1, u2, point1, point2, l1, l2} = isec;
        result.push({
          u0: curveClosestParam(curve1, point1),
          u1: curveClosestParam(curve2, point2),
          point0: point1,
          point1: point2
        });
        if (math.areEqual(u1, l1, TOLERANCE )) {
          i ++;
        }
        if (math.areEqual(u2, l2, TOLERANCE )) {
          j ++;
        }
      }
    }
  }
  return result;
}

function lineLineIntersection(p1, p2, v1, v2) {
  let zAx = vec.cross(v1, v2);
  const n1 = vec._normalize(vec.cross(zAx, v1));
  const n2 = vec._normalize(vec.cross(zAx, v2));
  return {
    u1: vec.dot(n2, vec.sub(p2, p1)) / vec.dot(n2, v1),
    u2: vec.dot(n1, vec.sub(p1, p2)) / vec.dot(n1, v2),
  }
}

function intersectSegs(a1, b1, a2, b2) {
  let v1 = vec.sub(b1, a1);
  let v2 = vec.sub(b2, a2);
  let l1 = vec.length(v1);
  let l2 = vec.length(v2);
  vec._div(v1, l1);
  vec._div(v2, l2);

  let {u1, u2} = lineLineIntersection(a1, a2, v1, v2);
  let point1 = vec.add(a1, vec.mul(v1, u1));
  let point2 = vec.add(a2, vec.mul(v2, u2));
  let p2p = vec.lengthSq(vec.sub(point1, point2));
  let eq = (a, b) => math.areEqual(a, b, TOLERANCE);
  if (u1 !== Infinity && u2 !== Infinity && math.areEqual(p2p, 0, TOLERANCE_SQ) &&
    ((u1 >0 && u1 < l1) || eq(u1, 0) || eq(u1, l1)) &&
    ((u2 >0 && u2 < l2) || eq(u2, 0) || eq(u2, l2))
  ) {
    return {point1, point2, u1, u2, l1, l2}
  }
  return null;
}

function dist(p1, p2) {
  return math.distance3(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
}