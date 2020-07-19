import Vector from 'math/vector';

export type Basis = [Vector, Vector, Vector];

export type Vec3 = [number, number, number];

const freeze = Object.freeze;

const ORIGIN = freeze(new Vector(0, 0, 0));

const AXIS = freeze({
  X: freeze(new Vector(1, 0, 0)),
  Y: freeze(new Vector(0, 1, 0)),
  Z: freeze(new Vector(0, 0, 1))
});

// @ts-ignore
const IDENTITY_BASIS: Basis = Object.freeze([AXIS.X, AXIS.Y, AXIS.Z]);

export const STANDARD_BASES = freeze({
  'XY': IDENTITY_BASIS,
  'XZ': [AXIS.X, AXIS.Z, AXIS.Y],
  'ZY': [AXIS.Z, AXIS.Y, AXIS.X]
});


function BasisForPlane(normal: Vector, alignY: Vector = AXIS.Y, alignZ: Vector = AXIS.Z): [Vector, Vector, Vector] {
  let alignPlane, x, y;
  if (Math.abs(normal.dot(alignY)) < 0.5) {
    alignPlane = normal.cross(alignY);
  } else {
    alignPlane = normal.cross(alignZ);
  }
  y = alignPlane.cross(normal);
  x = y.cross(normal);
  return [x, y, normal];
}

export {ORIGIN, IDENTITY_BASIS, AXIS, BasisForPlane};