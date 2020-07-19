import Vector, {AXIS} from "math/vector";
import {AXIS_X3, AXIS_Y3, AXIS_Z3, VectorData} from "math/vec";

export type Basis = [Vector, Vector, Vector];

export const IDENTITY_BASIS: Basis = Object.freeze([AXIS.X, AXIS.Y, AXIS.Z]) as Basis;
export const IDENTITY_BASIS3 = Object.freeze([AXIS_X3, AXIS_Y3, AXIS_Z3]) as VectorData[];

export const STANDARD_BASES = Object.freeze({
  'XY': IDENTITY_BASIS,
  'XZ': [AXIS.X, AXIS.Z, AXIS.Y],
  'ZY': [AXIS.Z, AXIS.Y, AXIS.X]
});

export function BasisForPlane(normal: Vector, alignY: Vector = AXIS.Y, alignZ: Vector = AXIS.Z): [Vector, Vector, Vector] {
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

