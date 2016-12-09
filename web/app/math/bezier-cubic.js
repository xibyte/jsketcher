import Vector from './vector'
import * as math from './math'

export function LUT(a, b, cp1, cp2, scale) {
  scale = 1/scale;

  const rotation = Math.atan2(b.y - a.y, b.x - b.x);

  const tr = (p) => rotate(p, rotation);
  const trBack = (p) => rotate(p, -rotation);
  
  const curve = new CurveData(tr(a), tr(b), tr(cp1), tr(cp2));
  
  const lut = [a];
  for (let t = 0; t < 1; t += 0.1 * scale) {
    const p = compute(t, curve);
    lut.push(trBack(p));
  }
  lut.push(b);
  return lut;
}

function rotate(point, angle) {
  return math.rotate(point.x, point.y, angle);
} 

export function compute(t, curve) {
  const mt = 1-t;
  const mt2 = mt*mt;
  const t2 = t*t;

  const a = mt2*mt;
  const b = mt2*t*3;
  const c = mt*t2*3;
  const d = t*t2;
  const p0 = curve.a;
  const p3 = curve.b;
  const p1 = curve.cp1;
  const p2 = curve.cp2;
  return new Vector(
    a*p0.x + b*p1.x + c*p2.x + d*p3.x,
    a*p0.y + b*p1.y + c*p2.y + d*p3.y,
    a*p0.z + b*p1.z + c*p2.z + d*p3.z
  );
}

function CurveData(a, b, cp1, cp2) {
  this.a = a;
  this.b = b;
  this.cp1 = cp1;
  this.cp2 = cp2;
}
