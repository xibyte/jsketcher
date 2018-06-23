import {NOT_INITIALIZED} from './utils';

export function memoize(fn) {
  let value;
  let lastArg = NOT_INITIALIZED;
  return arg => {
    if (arg !== lastArg) {
      lastArg = arg;
      value = fn(arg);
    }
    return value;
  }
}