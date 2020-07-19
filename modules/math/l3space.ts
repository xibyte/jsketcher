import Vector from 'math/vector';

export type Vec3 = [number, number, number];

const freeze = Object.freeze;

const ORIGIN = freeze(new Vector(0, 0, 0));

const AXIS = freeze({
  X: freeze(new Vector(1, 0, 0)),
  Y: freeze(new Vector(0, 1, 0)),
  Z: freeze(new Vector(0, 0, 1))
});


export {ORIGIN, AXIS};