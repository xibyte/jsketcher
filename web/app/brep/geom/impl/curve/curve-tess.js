import * as vec from "math/vec";

export default function curveTess(curve, min, max, tessTol, scale) {
  return curveTessParams(curve, min, max, tessTol, scale).map(u => curve.point(u));
}

export function curveTessParams(curve, min, max, tessTol, scale) {

  let out = [];
  let knots = curve.knots();

  let splits = [min];

  for (let split of knots) {
    if (split > min && split < max) {
      splits.push(split);
    }
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
}

export function curveStep(curve, u, tessTol, scale) {
  tessTol = tessTol || 1;
  scale = scale || 1;
  let ders = curve.eval(u, 2);
  let r1 = ders[1];
  let r2 = ders[2];

  let r1lsq = vec.lengthSq(r1);
  let r1l = Math.sqrt(r1lsq);

  let r = r1lsq * r1l / vec.length(vec.cross(r1, r2));
  let tol = tessTol / scale;

  let step = 2 * Math.sqrt(tol*(2*r -  tol)) / r1l;
  return step;
}