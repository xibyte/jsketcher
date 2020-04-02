export {dotVM} from 'numeric';

export function scalarOperand(v, out, func) {
  for (let i = 0; i < v.length; i++) {
    out[i] = func(v[i]);
  }
  return out;
}

function vectorOperand(v1, v2, out, func) {
  for (let i = 0; i < v1.length; i++) {
    out[i] = func(v1[i], v2[i]);
  }
  return out;
}

export function __mul(v, scalar, out) {
  return scalarOperand(v, out, x => x * scalar); 
}

export function _mul(v, scalar) {
  return __mul(v, scalar, v);
}

export function mul(v, scalar) {
  return __mul(v, scalar, []);
}

export function __div(v, scalar, out) {
  return scalarOperand(v, out, x => x / scalar);
}

export function _div(v, scalar) {
  return __div(v, scalar, v);
}

export function div(v, scalar) {
  return __div(v, scalar, []);
}


export function __add(v1, v2, out) {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 + x2);
}

export function _add(v1, v2) {
  return __add(v1, v2, v1);
}

export function add(v1, v2) {
  return __add(v1, v2, []);
}

export function __sub(v1, v2, out) {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 - x2);
}

export function _sub(v1, v2) {
  return __sub(v1, v2, v1);
}

export function sub(v1, v2) {
  return __sub(v1, v2, []);
}

export function __negate(v, out) {
  return scalarOperand(v, out, x => -x);
}

export function _negate(v) {
  return __negate(v, v);
}

export function negate(v) {
  return __negate(v, []);
}


export function dot(v1, v2) {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}

export function __cross(v1, v2, out) {
  out[0] = v1[1] * v2[2] - v1[2] * v2[1];
  out[1] = v1[2] * v2[0] - v1[0] * v2[2];
  out[2] = v1[0] * v2[1] - v1[1] * v2[0];
  return out;
}

export function cross(v1, v2) {
  return __cross(v1, v2, []);
}

export function __normalize(v, out) {
  const mag = length(v);
  if (mag === 0.0) {
    out[0] = out[1] = out[2] = 0;
  }
  return __div(v, mag, out)
}

export function cross2d(v1, v2) {
  return v1[0] * v2[1] - v1[1] * v2[0];
}

export function _normalize(v) {
  return __normalize(v, v);
}

export function normalize(v) {
  return __normalize(v, []);
}


export function lengthSq(v) {
  return dot(v, v);
}

export function length(v) {
  return Math.sqrt(lengthSq(v));
}

export function copy(to, from) {
  for (let i = 0; i < v.length; i++) {
    to[i] = from(v[i]);
  }
  return to;
}

export function clone(v) {
  return copy(create(v.length), v);
}

export function create(dim) {
  let out = [];
  for (let i = 0; i < dim; i++) {
    out[i] = 0;
  }
  return out;
}

export {create as newVector};

const sq = v => v * v; 

export function distanceSq(v1, v2) {
  let dSq = 0;
  for (let i = 0; i < v1.length; i++) {
    dSq += sq(v1[i] - v2[i]);
  }
  return dSq;
}

export function distance(v1, v2) {
  return Math.sqrt(distanceSq(v1, v2));
}

export function perp2d(v) {
  return __perp2d(v, []);
}

export function _perp2d(v) {
  return __perp2d(v, v);
}

export function __perp2d([x, y], out) {
  out[0] = -y;
  out[1] = x;
  return out;
}

export function normal3(ccwSequence) {
  let a = ccwSequence[0];
  let b = ccwSequence[1];
  let c = ccwSequence[2];

  return _normalize( cross(sub(b, a), sub(c, a) ) );
}

export function polynomial(coefs, vectors) {
  let out = [];
  out.length = vectors[0].length;
  out.fill(0);
  for (let i = 0; i < vectors.length; i++) {
    for (let j = 0; j < out.length; j++) {
      out[j] += vectors[i][j] * coefs[i]; 
    }
  }
  return out;
}

export const AXIS_X3 = [1,0,0];
export const AXIS_Y3 = [0,1,0];
export const AXIS_Z3 = [0,0,1];
export const ORIGIN3 = [0,0,0];
export const BASIS3 = [AXIS_X3, AXIS_Y3, AXIS_Z3];
