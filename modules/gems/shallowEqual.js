export default function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  let aKeys = Object.keys(objA);
  let bKeys = Object.keys(objB);
  let len = aKeys.length;

  if (bKeys.length !== len) {
    return false;
  }

  for (let i = 0; i < len; i++) {
    let key = aKeys[i];

    if (objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
};