import * as vec from "math/vec";
import {eqEps, TOLERANCE, TOLERANCE_01, TOLERANCE_SQ} from '../tolerance';
import {fmin_bfgs} from "math/optim/bfgs";
import {areEqual} from "math/equality";
import {NurbsCurveData} from "geom/curves/nurbsCurveData";

export function curveStep(curve, u, tessTol, scale) {

  const ders = verb.eval.Eval.rationalCurveDerivatives( curve, u, 2 );
  const d1 = ders[1];
  const d2 = ders[2];

  return genericCurveStep(d1, d2, tessTol, scale);
}

export function genericCurveStep(d1, d2, tessTol = 1, scale = 1) {
  const r1 = d1;
  const r2 = d2;

  const r1lsq = vec.lengthSq(r1);
  const r1l = Math.sqrt(r1lsq);

  const r = r1lsq * r1l / vec.length(vec.cross(r1, r2));
  const tol = tessTol / scale;

  const step = 2 * Math.sqrt(tol*(2*r -  tol)) / r1l;
  return step;
}


export function curveDomain(curve: NurbsCurveData): [number, number] {
  return [curve.knots[0], curve.knots[curve.knots.length - 1]];
}

export function distinctKnots(knots) {
  const out = [knots[0]];
  for (let i = 1; i < knots.length; ++i) {
    if (out[out.length - 1] !== knots[i]) {
      out.push(knots[i]);
    }
  }
  return out;
}

export function curveTessellate(curve: NurbsCurveData, min?: number, max?: number, tessTol?: number, scale?: number) {

  if (curve.degree === 1) {
    return distinctKnots(curve.knots);
  }
  const domain = curveDomain(curve);

  const [dmin, dmax] = domain;

  let nSplits = curve.knots.length - 1;

  let splitStep = (dmax - dmin) / nSplits;
  nSplits = Math.round((max - min) / splitStep);
  splitStep = (max - min) / nSplits;
  
  const splits = [min];
  
  for (let i = 1; i < nSplits; ++i) {
    splits.push(min + i * splitStep);
  }
  splits.push(max);
  return curveRefineTessellation(curve, splits, tessTol, scale)
}

export function curveRefineTessellation(curve, tess, tessTol, scale) {
  const out = [];
  function refine(u1, u2, step) {
    if (step <  u2 - u1) {
      const mid = u1 + (u2 - u1) * 0.5;
      refine(u1, mid, step);
      out.push(mid);
      refine(mid, u2, curveStep(curve, mid, tessTol, scale));
    }
  }
  for (let i = 1; i < tess.length; ++i) {
    const u1 = tess[i - 1];
    out.push(u1);
    refine(u1, tess[i], curveStep(curve, u1, tessTol, scale));
  }

  out.push(tess[tess.length - 1]);
  return out;
}

export function curvePoint(curve, u) {
  return verb.eval.Eval.rationalCurvePoint( curve, u );
}

export function curveClosestParam(curve, point) {
  return verb.eval.Analyze.rationalCurveClosestParam(curve, point);
}

export const surfaceClosestParam = verb.eval.Analyze.rationalSurfaceClosestParam;

export function surfaceIntersect(surface0, surface1) {
  const tess0 = verb.eval.Tess.rationalSurfaceAdaptive(surface0);
  const tess1 = verb.eval.Tess.rationalSurfaceAdaptive(surface1);
  
  function fixTessNaNPoitns(s, tess) {
    for (let i = 0; i < tess.points.length; i++) {
      const pt = tess.points[i];
      if (Number.isNaN(pt[0]) || Number.isNaN(pt[1]) || Number.isNaN(pt[2])) {
        const [u, v] = tess.uvs[i];
        tess.points[i] = verb.eval.Eval.rationalSurfacePoint(s, u, v);
      }
    }
  }

  fixTessNaNPoitns(surface0, tess0);
  fixTessNaNPoitns(surface1, tess1);
  
  const resApprox = meshesIntersect(tess0,tess1, TOLERANCE, TOLERANCE_SQ, TOLERANCE_01);
  const exactPls = resApprox.map(function(pl) {
    return pl.map(function(inter) {
      return verb.eval.Intersect.surfacesAtPointWithEstimate(surface0,surface1,inter.uv0,inter.uv1,TOLERANCE);
    });
  });

  const degree = Math.max(surfaceMaxDegree(surface0) === 1 && surfaceMaxDegree(surface1));
  const inserts = degree - 1; 
  const nurbses = [];
  //TODO: temporary workaround. evenly distribute points accordingly to degree. 
  //TODO: it won't work for ellipses.
  //TODO: it also creates unnecessary degree if a cylinder is cut by a plane along it's Y axis(heightwise) 
  for (const pl of exactPls) {
    const points = pl.map(ip => ip.point);
    const polyline = verb.eval.Make.polyline(points);
    const [uMin, uMax] = curveDomain(polyline);
    const insertStep = (uMax - uMin) / (inserts + 1);
    const normalizedPoints = [points[0]];
    for (let i = 0; i < inserts; i++) {
      const roughPt = curvePoint(polyline, i+insertStep);
      const uv0 = verb.eval.Analyze.rationalSurfaceClosestParam(surface0, roughPt);
      const uv1 = verb.eval.Analyze.rationalSurfaceClosestParam(surface1, roughPt);
      const pt = verb.eval.Intersect.surfacesAtPointWithEstimate(surface0,surface1,uv0,uv1,TOLERANCE);
      normalizedPoints.push(pt);
    }
    normalizedPoints.push(points[points.length - 1]);

    const nurbs = verb.eval.Make.rationalInterpCurve(normalizedPoints, degree);
    nurbses.push(nurbs);
  }
  
  return nurbses;
}

export function meshesIntersect(mesh0,mesh1, TOLERANCE, TOLERANCE_SQ, TOLERANCE_01) {
  const bbtree0 = new verb.core.LazyMeshBoundingBoxTree(mesh0);
  const bbtree1 = new verb.core.LazyMeshBoundingBoxTree(mesh1);
  const bbints = verb.eval.Intersect.boundingBoxTrees(bbtree0,bbtree1,TOLERANCE);
  const segments = verb.core.ArrayExtensions.unique(bbints.map(function(ids) {
    return verb.eval.Intersect.triangles(mesh0,ids.item0,mesh1,ids.item1);
  }).filter(function(x) {
    return x != null;
  }).filter(function(x1) {
    return verb.core.Vec.distSquared(x1.min.point,x1.max.point) > TOLERANCE_SQ;
  }),function(a,b) {
    const s1 = verb.core.Vec.sub(a.min.uv0,b.min.uv0);
    const d1 = verb.core.Vec.dot(s1,s1);
    const s2 = verb.core.Vec.sub(a.max.uv0,b.max.uv0);
    const d2 = verb.core.Vec.dot(s2,s2);
    const s3 = verb.core.Vec.sub(a.min.uv0,b.max.uv0);
    const d3 = verb.core.Vec.dot(s3,s3);
    const s4 = verb.core.Vec.sub(a.max.uv0,b.min.uv0);
    const d4 = verb.core.Vec.dot(s4,s4);
    return d1 < TOLERANCE_01 && d2 < TOLERANCE_01 || d3 < TOLERANCE_01 && d4 < TOLERANCE_01;
  });
  return verb.eval.Intersect.makeMeshIntersectionPolylines(segments);
}

export function surfaceMaxDegree(surface) {
  return Math.max(surface.degreeU, surface.degreeV);
}

export function curveIntersect(curve1, curve2) {

  const result = [];
  const segs1 = curveTessellate(curve1);
  const segs2 = curveTessellate(curve2);

  for (let i = 0; i < segs1.length - 1; i++) {
    const a1 = segs1[i];
    const b1 = segs1[i + 1];
    for (let j = 0; j < segs2.length - 1; j++) {
      const a2 = segs2[j];
      const b2 = segs2[j + 1];

      //TODO: minimize
      const isec = intersectSegs(a1, b1, a2, b2);
      if (isec !== null) {
        const {point1, point2, l1, l2} = isec;

        let u1 = curveClosestParam(curve1, point1);
        let u2 = curveClosestParam(curve2, point2);
        [u1, u2] = curveExactIntersection(curve1, curve2, u1, u2);

        result.push({
          u0: u1,
          u1: u2,
          p0: point1,
          p1: point2
        });
        if (areEqual(u1, l1, TOLERANCE )) {
          i ++;
        }
        if (areEqual(u2, l2, TOLERANCE )) {
          j ++;
        }
      }
    }
  }
  return result;
}

function curveExactIntersection(curve1, curve2, u1, u2) {

  function f([u1, u2]) {
    return vec.lengthSq( vec.sub(curvePoint(curve1, u1), curvePoint(curve2, u2)));
  }
  function grad([u1, u2]) {
    const d1 = verb.eval.Eval.rationalCurveDerivatives(curve1, u1, 1);
    const d2 = verb.eval.Eval.rationalCurveDerivatives(curve2, u2, 1);
    const r = vec.sub(d1[0], d2[0]);
    const drdu = d1[1];
    const drdt = vec.mul(d2[1], -1);
    return [2 * vec.dot(drdu, r), 2 * vec.dot(drdt,r)];
  }
  const params = [u1, u2];
  return fmin_bfgs(f, params, TOLERANCE_SQ, grad).solution;
}

function lineLineIntersection(p1, p2, v1, v2) {
  const zAx = vec.cross(v1, v2);
  const n1 = vec._normalize(vec.cross(zAx, v1));
  const n2 = vec._normalize(vec.cross(zAx, v2));
  return {
    u1: vec.dot(n2, vec.sub(p2, p1)) / vec.dot(n2, v1),
    u2: vec.dot(n1, vec.sub(p1, p2)) / vec.dot(n1, v2),
  }
}

function intersectSegs(a1, b1, a2, b2) {
  const v1 = vec.sub(b1, a1);
  const v2 = vec.sub(b2, a2);
  const l1 = vec.length(v1);
  const l2 = vec.length(v2);
  vec._div(v1, l1);
  vec._div(v2, l2);

  const {u1, u2} = lineLineIntersection(a1, a2, v1, v2);
  const point1 = vec.add(a1, vec.mul(v1, u1));
  const point2 = vec.add(a2, vec.mul(v2, u2));
  const p2p = vec.lengthSq(vec.sub(point1, point2));
  const eq = (a, b) => areEqual(a, b, TOLERANCE);
  if (u1 !== Infinity && u2 !== Infinity && areEqual(p2p, 0, TOLERANCE_SQ) &&
    ((u1 >0 && u1 < l1) || eq(u1, 0) || eq(u1, l1)) &&
    ((u2 >0 && u2 < l2) || eq(u2, 0) || eq(u2, l2))
  ) {
    return {point1, point2, u1, u2, l1, l2}
  }
  return null;
}

export function normalizeCurveEnds(curve) {
  for (let i = 0; i < curve.knots.length; i++) {
    const val = curve.knots[i];
    if (eqEps(val, 0)) {
      curve.knots[i] = 0;
    } else if (eqEps(val, 1)) {
      curve.knots[i] = 1;
    }
  }
}

export function normalizeCurveParametrization(curve) {
  const [min, max] = curveDomain(curve);
  const d = max - min;
  for (let i = 0; i < curve.knots.length; i++) {
    const val = curve.knots[i];
    if (eqEps(val, min)) {
      curve.knots[i] = 0;
    } else if (eqEps(val, max)) {
      curve.knots[i] = 1;
    } else {
      curve.knots[i] = (val - min) / d;
    }
  }
  return curve;
}

export function normalizeCurveParametrizationIfNeeded(curve) {
  const [min, max] = curveDomain(curve);
  if (min !== 0 || max !== 1) {
    normalizeCurveParametrization(curve)
  }
}

export function curveInvert(curve) {
  const reversed = verb.eval.Modify.curveReverse(curve);
  return reversed;
}