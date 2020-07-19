export {dotVM} from 'numeric';

type UnaryFn = (number) => number;
type BinaryFn = (n1: number, n2: number) => number;
export type VectorData = number[];

export function scalarOperand(v: VectorData, out: VectorData, func: UnaryFn) {
  for (let i = 0; i < v.length; i++) {
    out[i] = func(v[i]);
  }
  return out;
}

function vectorOperand(v1: VectorData, v2: VectorData, out: VectorData, func: BinaryFn): VectorData {
  for (let i = 0; i < v1.length; i++) {
    out[i] = func(v1[i], v2[i]);
  }
  return out;
}

export function __mul(v: VectorData, scalar: number, out: VectorData): VectorData {
  return scalarOperand(v, out, x => x * scalar); 
}

export function _mul(v: VectorData, scalar: number): VectorData {
  return __mul(v, scalar, v);
}

export function mul(v: VectorData, scalar: number): VectorData {
  return __mul(v, scalar, []);
}

export function __div(v: VectorData, scalar: number, out: VectorData): VectorData {
  return scalarOperand(v, out, x => x / scalar);
}

export function _div(v: VectorData, scalar: number): VectorData {
  return __div(v, scalar, v);
}

export function div(v: VectorData, scalar: number): VectorData {
  return __div(v, scalar, []);
}


export function __add(v1: VectorData, v2: VectorData, out: VectorData): VectorData {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 + x2);
}

export function _add(v1: VectorData, v2: VectorData): VectorData {
  return __add(v1, v2, v1);
}

export function add(v1: VectorData, v2: VectorData): VectorData {
  return __add(v1, v2, []);
}

export function __sub(v1: VectorData, v2: VectorData, out: VectorData): VectorData {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 - x2);
}

export function _sub(v1: VectorData, v2: VectorData): VectorData {
  return __sub(v1, v2, v1);
}

export function sub(v1: VectorData, v2: VectorData): VectorData {
  return __sub(v1, v2, []);
}

export function __negate(v: VectorData, out: VectorData): VectorData {
  return scalarOperand(v, out, x => -x);
}

export function _negate(v: VectorData): VectorData {
  return __negate(v, v);
}

export function negate(v: VectorData): VectorData {
  return __negate(v, []);
}


export function dot(v1: VectorData, v2: VectorData): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}

export function __cross(v1: VectorData, v2: VectorData, out: VectorData): VectorData {
  out[0] = v1[1] * v2[2] - v1[2] * v2[1];
  out[1] = v1[2] * v2[0] - v1[0] * v2[2];
  out[2] = v1[0] * v2[1] - v1[1] * v2[0];
  return out;
}

export function cross(v1: VectorData, v2: VectorData): VectorData {
  return __cross(v1, v2, []);
}

export function __normalize(v: VectorData, out: VectorData): VectorData {
  const mag = length(v);
  if (mag === 0.0) {
    out[0] = out[1] = out[2] = 0;
  }
  return __div(v, mag, out)
}

export function cross2d(v1: VectorData, v2: VectorData): number {
  return v1[0] * v2[1] - v1[1] * v2[0];
}

export function _normalize(v: VectorData): VectorData {
  return __normalize(v, v);
}

export function normalize(v: VectorData): VectorData {
  return __normalize(v, []);
}

export function lengthSq(v: VectorData): number {
  return dot(v, v);
}

export function length(v: VectorData): number {
  return Math.sqrt(lengthSq(v));
}

export function copy(to: VectorData, from: VectorData): VectorData {
  for (let i = 0; i < from.length; i++) {
    to[i] = from[i];
  }
  return to;
}

export function clone(v: VectorData): VectorData {
  return copy(create(v.length), v);
}

export function create(dim: number): VectorData {
  let out = [];
  for (let i = 0; i < dim; i++) {
    out[i] = 0;
  }
  return out;
}

export {create as newVector};

const sq = v => v * v; 

export function distanceSq(v1: VectorData, v2: VectorData): number {
  let dSq = 0;
  for (let i = 0; i < v1.length; i++) {
    dSq += sq(v1[i] - v2[i]);
  }
  return dSq;
}

export function distance(v1: VectorData, v2: VectorData): number {
  return Math.sqrt(distanceSq(v1, v2));
}

export function perp2d(v: VectorData): VectorData {
  return __perp2d(v, []);
}

export function _perp2d(v: VectorData): VectorData {
  return __perp2d(v, v);
}

export function __perp2d([x, y]: VectorData, out: VectorData): VectorData {
  out[0] = -y;
  out[1] = x;
  return out;
}

export function normal3(ccwSequence: [VectorData, VectorData, VectorData]): VectorData {
  let a = ccwSequence[0];
  let b = ccwSequence[1];
  let c = ccwSequence[2];

  return _normalize( cross(sub(b, a), sub(c, a) ) );
}

export function polynomial(coefs: number[], vectors: VectorData[]): VectorData {
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

export function fromXYZ({x, y, z}: {
  x: number,
  y: number,
  z: number
}): VectorData {
  return [x, y, z];
}

export const AXIS_X3 = [1,0,0];
export const AXIS_Y3 = [0,1,0];
export const AXIS_Z3 = [0,0,1];
export const ORIGIN3 = [0,0,0];
