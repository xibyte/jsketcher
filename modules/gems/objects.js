export const EMPTY_OBJECT = Object.freeze({});

export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

