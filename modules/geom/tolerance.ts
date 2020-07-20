import {distanceSquared3} from "math/distance";
import {areEqual, areNegVectorsEqual, areVectorsEqual, areVectorsEqual3} from "math/equality";

export const TOLERANCE = 1e-3;
export const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

export const EPSILON = 1e-12;
export const EPSILON_SQ = EPSILON * EPSILON;


//tolerance used for parametric domain which is between 0..1
export const TOLERANCE_01 = TOLERANCE * 1e-2;
export const TOLERANCE_01_SQ = TOLERANCE * TOLERANCE;

export const NUMERICAL_SOLVE_TOL = 1e-8;
export const TIGHT_TOLERANCE = 1e-6;

export function eqTol(a, b) {
  return areEqual(a, b, TOLERANCE);
}

export function eqSqTol(a, b) {
  return areEqual(a, b, TOLERANCE_SQ);
}

export function eqEps(a, b) {
  return areEqual(a, b, EPSILON);
}

export function veq(a, b) {
  return areVectorsEqual(a, b, TOLERANCE_SQ);
}

export function veqNeg(a, b) {
  return areNegVectorsEqual(a, b, TOLERANCE_SQ);
}

export function veq3(a, b) {
  return areVectorsEqual3(a, b, TOLERANCE_SQ);
}

export function veqXYZ(x1, y1, z1, x2, y2, z2) {
  return distanceSquared3(x1, y1, z1, x2, y2, z2) < TOLERANCE_SQ; 
}

export function ueq(a, b) {
  return areEqual(a, b, TOLERANCE_01);
}

