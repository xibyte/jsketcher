export {dotVM} from 'numeric';

export type VectorData = number[];
export type Vec3 = [number, number, number];

type UnaryFn = (number) => number;
type BinaryFn = (n1: number, n2: number) => number;

export function scalarOperand<T extends VectorData>(v: T, out: T, func: UnaryFn) {
  for (let i = 0; i < v.length; i++) {
    out[i] = func(v[i]);
  }
  return out;
}

function vectorOperand<T extends VectorData>(v1: T, v2: T, out: T, func: BinaryFn): T {
  for (let i = 0; i < v1.length; i++) {
    out[i] = func(v1[i], v2[i]);
  }
  return out;
}

export function __mul<T extends VectorData>(v: T, scalar: number, out: T): T {
  return scalarOperand(v, out, x => x * scalar); 
}

export function _mul<T extends VectorData>(v: T, scalar: number): T {
  return __mul(v, scalar, v);
}

export function mul<T extends VectorData>(v: T, scalar: number): T {
  return __mul(v, scalar, create(v.length) as T);
}

export function __div<T extends VectorData>(v: T, scalar: number, out: T): T {
  return scalarOperand(v, out, x => x / scalar);
}

export function _div<T extends VectorData>(v: T, scalar: number): T {
  return __div(v, scalar, v);
}

export function div<T extends VectorData>(v: T, scalar: number): T {
  return __div(v, scalar, create(v.length) as T);
}


export function __add<T extends VectorData>(v1: T, v2: T, out: T): T {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 + x2);
}

export function _add<T extends VectorData>(v1: T, v2: T): T {
  return __add(v1, v2, v1);
}

export function add<T extends VectorData>(v1: T, v2: T): T {
  return __add(v1, v2, create(v1.length) as T);
}

export function __sub<T extends VectorData>(v1: T, v2: T, out: T): T {
  return vectorOperand(v1, v2, out, (x1, x2) => x1 - x2);
}

export function _sub<T extends VectorData>(v1: T, v2: T): T {
  return __sub(v1, v2, v1);
}

export function sub<T extends VectorData>(v1: T, v2: T): T {
  return __sub(v1, v2, create(v1.length) as T);
}

export function __negate<T extends VectorData>(v: T, out: T): T {
  return scalarOperand(v, out, x => -x);
}

export function _negate<T extends VectorData>(v: T): T {
  return __negate(v, v);
}

export function negate<T extends VectorData>(v: T): T {
  return __negate(v, create(v.length) as T);
}


export function dot<T extends VectorData>(v1: T, v2: T): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}

export function __cross<T extends VectorData>(v1: T, v2: T, out: T): T {
  out[0] = v1[1] * v2[2] - v1[2] * v2[1];
  out[1] = v1[2] * v2[0] - v1[0] * v2[2];
  out[2] = v1[0] * v2[1] - v1[1] * v2[0];
  return out;
}

export function cross<T extends VectorData>(v1: T, v2: T): T {
  return __cross(v1, v2, create(v1.length) as T);
}

export function __normalize<T extends VectorData>(v: T, out: T): T {
  const mag = length(v);
  if (mag === 0.0) {
    out[0] = out[1] = out[2] = 0;
  }
  return __div(v, mag, out)
}

export function cross2d<T extends VectorData>(v1: T, v2: T): number {
  return v1[0] * v2[1] - v1[1] * v2[0];
}

export function _normalize<T extends VectorData>(v: T): T {
  return __normalize(v, v);
}

export function normalize<T extends VectorData>(v: T): VectorData {
  return __normalize(v, create(v.length) as T);
}

export function lengthSq(v: VectorData): number {
  return dot(v, v);
}

export function length(v: VectorData): number {
  return Math.sqrt(lengthSq(v));
}

export function copy<T extends VectorData>(to: T, from: T): T {
  for (let i = 0; i < from.length; i++) {
    to[i] = from[i];
  }
  return to;
}

export function clone<T extends VectorData>(v: T): T {
  return copy(create(v.length) as T, v);
}

export function create(dim: number): VectorData {
  const out = new Array<number>(dim);
  out.fill(0);
  return out;
}

export {create as newVector};

const sq = v => v * v; 

export function distanceSq<T extends VectorData>(v1: T, v2: T): number {
  let dSq = 0;
  for (let i = 0; i < v1.length; i++) {
    dSq += sq(v1[i] - v2[i]);
  }
  return dSq;
}

export function distance<T extends VectorData>(v1: T, v2: T): number {
  return Math.sqrt(distanceSq(v1, v2));
}

export function perp2d<T extends VectorData>(v: T): T {
  return __perp2d(v, [] as T);
}

export function _perp2d<T extends VectorData>(v: T): T {
  return __perp2d(v, v);
}

export function __perp2d<T extends VectorData>([x, y]: T, out: T): T {
  out[0] = -y;
  out[1] = x;
  return out;
}

export function normal3<T extends VectorData>(ccwSequence: [T, T, T]): T {
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

export const _vec = create;

export function _matrix(m, n) {
  const out = [];
  out.length = m;
  for (let i = 0; i < m; ++i) {
    out[i] = _vec(n);
  }
  return out;
}

export const AXIS_X3 = [1,0,0];
export const AXIS_Y3 = [0,1,0];
export const AXIS_Z3 = [0,0,1];
export const ORIGIN3 = [0,0,0];
