import * as vec from "../../../math/vec";
import * as math from  '../../../math/math'

export function radiusOfCurvature(r1, r2) {

}

export function curveStep(curve, u, tessToll, scale) {
  tessToll = tessToll || 5;
  scale = scale || 1;
  let r1 = verb.eval.Eval.rationalCurveDerivatives( curve, u, 1 );
  let r2 = verb.eval.Eval.rationalCurveDerivatives( curve, u, 2 );

  let r1lsq = vec.lengthSq(r1);
  let r1l = Math.sqrt(r1lsq);

  let r = r1lsq * r1l / vec.length(vec.cross(r1, r2));
  let toll = tessToll / scale;

  let step = 2 * Math.sqrt(toll*(2*r -  toll)) / r1l;
  return step;
}

export function curveDomain(curve) {
  return [curve.knots[0], curve.knots[curve.knots.length - 1]];
}

export function curveTessellate(curve, tessToll, scale ) {
  let [from, to] = curveDomain(curve);
  let out = [];
  let u = from;
  while (u < to) {
    out.push(u);
    u += curveStep(curve, u, tessToll, scale );
  }
  let uLast = out[out.length - 1];
  out[out.length - 1] = (to - uLast) * 0.5;
  out.push(to);
  return out;
}

export function verb_surface_isec(nurbs1, nurbs2, tol) {
  const surface0 = nurbs1.asNurbs();
  const surface1 = nurbs2.asNurbs();
  const tess1 = verb.eval.Tess.rationalSurfaceAdaptive(surface0);
  const tess2 = verb.eval.Tess.rationalSurfaceAdaptive(surface1);
  const resApprox = verb.eval.Intersect.meshes(tess1,tess2);
  const exactPls = resApprox.map(function(pl) {
    return pl.map(function(inter) {
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surface0,surface1,inter.uv0,inter.uv1,tol);
    });
  });
  return exactPls.map(function(x) {
    return verb.eval.Make.rationalInterpCurve(x.map(function(y) {
      return y.point;
    }), x.length - 1);
  }).map(cd => new verb.geom.NurbsCurve(cd));
}

export function verb_curve_isec(curve1, curve2, tol) {

  let result = [];
  let segs1 = curve1.tessellate(100000);
  let segs2 = curve2.tessellate(100000);

  for (let i = 0; i < segs1.length - 1; i++) {
    let a1 = segs1[i];
    let b1 = segs1[i + 1];
    for (let j = 0; j < segs2.length - 1; j++) {
      let a2 = segs2[j];
      let b2 = segs2[j + 1];

      //TODO: minimize
      let isec = intersectSegs(a1, b1, a2, b2, tol);
      if (isec !== null) {
        let {u1, u2, point1, point2, l1, l2} = isec;
        result.push({
          u0: curve1.closestParam(point1),
          u1: curve2.closestParam(point2),
          point0: point1,
          point1: point2
        });
        if (math.areEqual(u1, l1, tol )) {
          i ++;
        }
        if (math.areEqual(u2, l2, tol )) {
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

function intersectSegs(a1, b1, a2, b2, tol) {
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
  let eq = (a, b) => math.areEqual(a, b, tol);
  if (u1 !== Infinity && u2 !== Infinity && math.areEqual(p2p, 0, tol*tol) &&
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