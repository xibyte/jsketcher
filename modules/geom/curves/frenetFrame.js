import * as vec from 'math/vec';
import {perpendicularVector} from "../euclidean";

export function frenetFrame(D1, D2) {
  let T = vec.normalize(D1);
  let N = vec.normalize(D2);
  let B = vec.cross(T, N);
  return [T, N, B];
}

export function pseudoFrenetFrame(D1) {
  let T = vec.normalize(D1);
  let N = perpendicularVector(T);
  let B = vec.cross(T, N);
  return [T, N, B];
}

export function advancePseudoFrenetFrame(refFrame, T) {
  let B = vec._normalize(vec.cross(T, refFrame[1]));
  let N = vec.cross(B, T);
  return [T, N, B];
}