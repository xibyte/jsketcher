
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

export function fillArray(a, fromIndex, toIndex,val) {
  for (var i = fromIndex; i < toIndex; i++)
    a[i] = val;
}

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