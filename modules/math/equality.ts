import {distanceSquared3, distanceSquaredAB3, distanceSquaredANegB3} from "math/distance";

export const TOLERANCE = 1E-6;
export const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

export function areEqual(v1, v2, tolerance) {
  return Math.abs(v1 - v2) < tolerance;
}

export function areVectorsEqual(v1, v2, toleranceSQ) {
  return areEqual(distanceSquaredAB3(v1, v2), 0, toleranceSQ);
}

export function areNegVectorsEqual(v1, v2, toleranceSQ) {
  return areEqual(distanceSquaredANegB3(v1, v2), 0, toleranceSQ);
}

export function areVectorsEqual3(v1, v2, toleranceSQ) {
  return areEqual(distanceSquared3(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]), 0, toleranceSQ);
}

export function vectorsEqual(v1, v2) {
  return areVectorsEqual(v1, v2, TOLERANCE_SQ);
}

export function equal(v1, v2) {
  return areEqual(v1, v2, TOLERANCE);
}

export function strictEqual(a, b) {
  return a.x == b.x && a.y == b.y && a.z == b.z;
}

export function strictEqual2D(a, b) {
  return a.x == b.x && a.y == b.y;
}