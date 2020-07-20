import {sq} from "math/commons";

export function greaterThanConstraint(val) {
  const K = 100;
  return {
    d0: x => K*sq(Math.min(0, x - val)),
    d1: x => x < val ? K*(2*x - 2*val) : 0
  }
}

export function lessThanConstraint(val) {
  const K = 100;
  return {
    d0: x => K*sq(Math.max(0, x - val)),
    d1: x => x <= val ? 0 : K*(2*x - 2*val)
  }
}
