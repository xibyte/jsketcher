import Vector from './vector'
import * as math from './math'

export function LUT(a, b, cp1, cp2, scale) {
  scale = 1 / scale;
  const lut = [a];
  for (let t = 0; t < 1; t += 0.1 * scale) {
    const p = compute(t, a, b, cp1, cp2);
    lut.push(p);
  }
  lut.push(b);
  return lut;
}

export function compute(t, from, to, controlPoint1, controlPoint2) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  const a = mt2 * mt;
  const b = mt2 * t * 3;
  const c = mt * t2 * 3;
  const d = t * t2;
  const p0 = from;
  const p3 = to;
  const p1 = controlPoint1;
  const p2 = controlPoint2;
  return new Vector(
    a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    a * p0.z + b * p1.z + c * p2.z + d * p3.z
  );
}
