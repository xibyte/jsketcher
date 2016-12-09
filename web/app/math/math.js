import Vector from './vector'

export const TOLERANCE = 1E-6;

export function distanceAB(a, b) {
  return distance(a.x, a.y, b.x, b.y);
}

export function distance(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceAB3(a, b) {
  return distance3(a.x, a.y, a.z, b.x, b.y, b.z);
}

export function distance3(x1, y1, z1, x2, y2, z2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  var dz = z1 - z2;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function circleFromPoints(p1, p2, p3) {
  var center = new Vector();
  var offset = p2.x*p2.x + p2.y*p2.y;
  var bc =   ( p1.x*p1.x + p1.y*p1.y - offset )/2.0;
  var cd =   (offset - p3.x*p3.x - p3.y*p3.y)/2.0;
  var det =  (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x)* (p1.y - p2.y);

  if (Math.abs(det) < TOLERANCE) { return null; }

  var idet = 1/det;

  center.x =  (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
  center.y =  (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
  return center;
}

export function norm2(vec) {
  var sq = 0;
  for (var i = 0; i < vec.length; i++) {
    sq += vec[i] * vec[i];
  }
  return Math.sqrt(sq);  
}

export function areEqual(v1, v2, tolerance) {
  return Math.abs(v1 - v2) < tolerance;
}

export function areVectorsEqual(v1, v2, tolerance) {
  return areEqual(v1.x, v2.x, tolerance) &&
         areEqual(v1.y, v2.y, tolerance) &&
         areEqual(v1.z, v2.z, tolerance);
}

export function vectorsEqual(v1, v2) {
  return areVectorsEqual(v1, v2, TOLERANCE);
}

export function equal(v1, v2) {
  return areEqual(v1, v2, TOLERANCE);
}

export function strictEqual(a, b) {
  return a.x == b.x && a.y == b.y && a.z == b.z;
}

export function _vec(size) {
  var out = [];
  out.length = size;
  for (var i = 0; i < size; ++i) {
    out[i] = 0;
  }
  return out;
}

export function _matrix(m, n) {
  var out = [];
  out.length = m;
  for (var i = 0; i < m; ++i) {
    out[i] = _vec(n);
  }
  return out;
}

export const sq = (a) => a * a;
