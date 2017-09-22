export function __mul(v, scalar, out) {
  out[0] = scalar * v[0];
  out[1] = scalar * v[1];
  out[2] = scalar * v[2];
  return out;
}

export function _mul(v, scalar) {
  return __mul(v, scalar, v);
}

export function mul(v, scalar) {
  return __mul(v, scalar, []);
}

export function __div(v, scalar, out) {
  out[0] = v[0] / scalar;
  out[1] = v[1] / scalar;
  out[2] = v[2] / scalar;
  return out;
}

export function _div(v, scalar) {
  return __div(v, scalar, v);
}

export function div(v, scalar) {
  return __div(v, scalar, []);
}


export function __add(v1, v2, out) {
  out[0] = v1[0] + v2[0];
  out[1] = v1[1] + v2[1];
  out[2] = v1[2] + v2[2];
  return out;
}

export function _add(v1, v2) {
  return __add(v1, v2, v1);
}

export function add(v1, v2) {
  return __add(v1, v2, []);
}

export function __sub(v1, v2, out) {
  out[0] = v1[0] - v2[0];
  out[1] = v1[1] - v2[1];
  out[2] = v1[2] - v2[2];
  return out;
}

export function _sub(v1, v2) {
  return __sub(v1, v2, v1);
}

export function sub(v1, v2) {
  return __sub(v1, v2, []);
}


export function __negate(v, out) {
  out[0] = - v[0];
  out[1] = - v[1];
  out[2] = - v[2];
  return out;
}

export function _negate(v) {
  return __negate(v, v);
}

export function negate(v) {
  return __negate(v, []);
}


export function dot(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

export function __cross(v1, v2, out) {
  out[0] = v1[1] * v2[2] - v1[2] * v2[1];
  out[1] = v1[2] * v2[0] - v1[0] * v2[2];
  out[2] = v1[0] * v2[1] - v1[1] * v2[0];
  return out;
}

export function _cross(v1, v2) {
  return __cross(v1, v2);
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
