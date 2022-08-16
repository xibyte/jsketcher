import {NUMERICAL_SOLVE_TOL, TOLERANCE, TOLERANCE_01, TOLERANCE_SQ} from '../tolerance';
import {curveDomain, curvePoint, meshesIntersect, surfaceMaxDegree} from '../impl/nurbs-ext';
import {IntersectionCurve} from '../curves/intersectionCurve';
import * as vec from 'math/vec';

export function surfaceIntersect(surfaceA, surfaceB) {
  const tessA = verb.eval.Tess.rationalSurfaceAdaptive(surfaceA);
  const tessB = verb.eval.Tess.rationalSurfaceAdaptive(surfaceB);

  function fixTessNaNPoitns(s, tess) {
    for (let i = 0; i < tess.points.length; i++) {
      const pt = tess.points[i];
      if (Number.isNaN(pt[0]) || Number.isNaN(pt[1]) || Number.isNaN(pt[2])) {
        const [u, v] = tess.uvs[i];
        tess.points[i] = verb.eval.Eval.rationalSurfacePoint(s, u, v);
      }
    }
  }

  fixTessNaNPoitns(surfaceA, tessA);
  fixTessNaNPoitns(surfaceB, tessB);

  const resApprox = meshesIntersect(tessA, tessB, TOLERANCE, TOLERANCE_SQ, TOLERANCE_01);
  const exactPls = resApprox.map(pl => pl.map(inter =>
    verb.eval.Intersect.surfacesAtPointWithEstimate(surfaceA, surfaceB, inter.uv0, inter.uv1, NUMERICAL_SOLVE_TOL)
  ));

  const curves = [];
  for (const pl of exactPls) {
    let points = pl.map(ip => ip.point);

    points = removeSuperfluousPoints(points, 30*30); //5*5
    // points.forEach(__DEBUG__.AddPoint3);
    curves.push(new IntersectionCurve(points, surfaceA, surfaceB))
  }
  return curves;
}

//it's Douglas–Peucker and it's not well suited here
function removeSuperfluousPoints(points, tolSq) {

  const out = [];
  const stack = [[0, points.length - 1]];
  out.push(points[0]);
  while (stack.length !== 0) {
    const stackItem = stack.pop();
    if (!Array.isArray(stackItem)) {
      out.push(points[stackItem]);
      continue;
    }
    const [from, to] = stackItem;
    let maxDistSq = tolSq;
    let hero = -1;
    const v = vec._normalize(vec.sub(points[to], points[from]));

    for (let i = from + 1; i < to; i ++) {
      const proj = vec.dot(v, vec.sub(points[i], points[from]));
      const vA = vec.add(points[from], vec.mul(v, proj));
      const vX = vec.sub(points[i], vA);
      const perpDistSq = vec.lengthSq(vX);
      if (perpDistSq > maxDistSq) {
        hero = i;
        maxDistSq = perpDistSq;
      }
    }
    if (hero !== -1) {
      if (to - hero > 1) {
        stack.push([hero, to]);
      }
      stack.push(hero);
      if (hero - from > 1) {
        stack.push([from, hero]);
      }
    }
  }
  out.push(points[points.length - 1]);
  return out;
}