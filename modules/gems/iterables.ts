
export function findDiff(arr1, arr2) {
  
  const both = [];
  const firstOnly = [];
  const secondOnly = [];
  
  for (const e1 of arr1) {
    for (const e2 of arr2) {
      if (e1 === e2) {
        both.push(e1);
      } 
    }    
  }

  for (const e1 of arr1) {
    if (both.indexOf(e1) === -1) {
      firstOnly.push(e1);
    }
  }

  for (const e2 of arr2) {
    if (both.indexOf(e2) === -1) {
      secondOnly.push(e2);
    }
  }

  return [both, firstOnly, secondOnly]
}

export function flatten(arr, result = [], depth, _currLevel) {
  _currLevel = _currLevel || 1;
  for (let i = 0, length = arr.length; i < length; i++) {
    const value = arr[i];
    if (Array.isArray(value) && depth && _currLevel !== depth) {
      flatten(value, result, depth, _currLevel ++);
    } else {
      result.push(value);
    }
  }
  return result;
}

export function indexArray(array, getKey, getValue = v => v) {
  const obj = {};
  array.forEach(item => obj[getKey(item)] = getValue(item))
  return obj;
}

export function addToListInMap(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

export function addToSetInMap(map, key, value) {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
}

export function removeFromSetInMap(map, key, value) {
  const set = map.get(key);
  if (set) {
    set.delete(value);
    if (set.size === 0) {
      map.delete(key);
    }
  }
}


export function removeInPlace(arr, val) {
  const index = arr.indexOf(val);
  if (index !== -1) {
    arr.splice(index, 1);
  }
  return arr;
}

export function indexById<T extends {id: string}>(array: T[]): {[id: string]: T} {
  const out = {};
  array.forEach(i => out[i.id] = i);
  return out;
}

export function insertAfter(arr, item, toAdd) {
  const index = arr.indexOf(item);
  if (index !== -1) {
    arr.splice(index+1, 0, toAdd);
  }
}

export function fillArray(a, fromIndex, toIndex,val) {
  for (let i = fromIndex; i < toIndex; i++)
    a[i] = val;
}

export const EMPTY_ARRAY = Object.freeze([]);
