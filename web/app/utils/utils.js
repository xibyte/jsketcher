
export function askNumber(promptText, initValue, promptCallback, resolver) {
  var promptValueStr = promptCallback(promptText, initValue);
  if (promptValueStr != null) {
    var promptValue = Number(promptValueStr);
    if (promptValue == promptValue) { // check for NaN
      return promptValue;
    } else {
      if (!!resolver) {
        promptValue = resolver(promptValueStr);
        if (promptValue == promptValue) {
          return promptValueStr;
        }
      }
    }
  }
  return null;
}

export const extend = function(func, parent) {
  for(var prop in parent.prototype) {
    if(parent.prototype.hasOwnProperty(prop))
      func.prototype[prop] = parent.prototype[prop];
  }
};

export function constRef(value) {
  return function() {
    return value;
  };
}

export function swap(arr, i1, i2) {
  const tmp = arr[i1];
  arr[i1] = arr[i2];
  arr[i2] = tmp;
}

export function defineIterable(obj, name, iteratorFactory) {
  obj[name] = {};
  obj[name][Symbol.iterator] = iteratorFactory;
}

export class DoubleKeyMap {

  constructor() {
    this.map = new Map();
  }

  get(a, b) {
    let subMap = this.map.get(a);
    if (subMap == null) {
      subMap = this.map.get(b);
      if (subMap != null) {
        return subMap.get(a);
      }
      return null;
    }
    return subMap.get(b);
  }

  set(a, b, value) {
    let subMap = this.map.get(a);
    if (subMap == null) {
      subMap = this.map.get(b);
      if (subMap != null) {
        subMap.set(a, value);
        return;
      }
      subMap = new Map();
      this.map.set(a, subMap);
    } 
    subMap.set(b, value);
  }
}

export function reversedIndex(i, n) {
  let lidIdx = n - i;
  if (lidIdx == n) {
    lidIdx = 0;
  }
  return lidIdx;
}

export function rotateArr(arr, pivot) {
  
  function reverse(arr, from, to) {
    to --;
    while (from < to) {
      const t = arr[from];
      arr[from] = arr[to];
      arr[to] = t;
      from ++;
      to --;
    }
  }
  reverse(arr, 0, pivot);
  reverse(arr, pivot, arr.length);
  reverse(arr, 0, arr.length);
}