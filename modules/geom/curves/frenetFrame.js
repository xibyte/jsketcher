import * as vec from 'math/vec';
import {perpendicularVector} from "../euclidean";

export function frenetFrame(D1, D2) {
  const T = vec.normalize(D1);
  const N = vec.normalize(D2);
  const B = vec.cross(T, N);
  return [T, N, B];
}

export function pseudoFrenetFrame(D1) {
  const T = vec.normalize(D1);
  const N = perpendicularVector(T);
  const B = vec.cross(T, N);
  return [T, N, B];
}

export function advancePseudoFrenetFrame(refFrame, T) {
  const B = vec._normalize(vec.cross(T, refFrame[1]));
  const N = vec.cross(B, T);
  return [T, N, B];
}