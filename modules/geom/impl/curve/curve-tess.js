import * as vec from "math/vec";

export default function curveTess(curve, min, max, tessTol, scale) {
  return curveTessParams(curve, min, max, tessTol, scale).map(u => curve.point(u));
}

export function curveTessParams(curve, min, max, tessTol, scale) {

  const out = [];
  const knots = curve.knots();

  const splits = [min];

  for (const split of knots) {
    if (split > min && split < max) {
      splits.push(split);
    }
  }
  splits.push(max);

  function refine(u1, u2, step) {
    if (step <  u2 - u1) {
      const mid = u1 + (u2 - u1) * 0.5;
      refine(u1, mid, step);
      out.push(mid);
      refine(mid, u2, curveStep(curve, mid, tessTol, scale));
    }
  }
  for (let i = 1; i < splits.length; ++i) {
    const u1 = splits[i - 1];
    out.push(u1);
    refine(u1, splits[i], curveStep(curve, u1, tessTol, scale));
  }

  out.push(max);
  return out;
}

export function curveStep(curve, u, tessTol, scale) {
  tessTol = tessTol || 1;
  scale = scale || 1;
  const ders = curve.eval(u, 2);
  const r1 = ders[1];
  const r2 = ders[2];

  const r1lsq = vec.lengthSq(r1);
  const r1l = Math.sqrt(r1lsq);

  const r = r1lsq * r1l / vec.length(vec.cross(r1, r2));
  const tol = tessTol / scale;

  const step = 2 * Math.sqrt(tol*(2*r -  tol)) / r1l;
  return step;
}