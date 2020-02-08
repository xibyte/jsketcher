


export function matchAll(selection, shapeConstructor, min) {
  if (min !== undefined && selection.length < min) {
    return false;
  }
  for (let obj of selection) {
    if (obj._class !== shapeConstructor.prototype._class) {
      return false;
    }
  }
  return true;
}


export function matchTypes(selection) {
  let si = 0;
  let i = 1;
  for (; i < arguments.length; i+=2) {
    let shapeConstructor = arguments[i];
    let quantity = arguments[i+1];
    if (si === selection.length) {
      return false;
    }
    for (let j = 0; j < quantity && si < selection.length; j++) {
      let obj = selection[si++];
      if (obj._class !== shapeConstructor.prototype._class) {
        return false;
      }
    }
  }
  return si === selection.length && i === arguments.length;
}

export function isInstanceOf(obj, shapeConstructor) {
  if (!obj) {
    return false;
  }
  return obj._class === shapeConstructor.prototype._class;
}

export function sortSelectionByType(selection) {
  return [...selection].sort((a, b) => a._class.localeCompare(b._class))
}
