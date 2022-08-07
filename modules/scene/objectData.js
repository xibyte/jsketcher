
export function setAttribute(obj, key, value) {
  getData(obj, true)[key] = value;
}

export function getAttribute(obj, key) {
  return getData(obj, false)[key];
}

export function unsetAttribute(obj, key) {
  delete getData(obj, false)[key];
}

function getData(obj, create) {
  let data = obj.__TCAD_CUSTOM_DATA;
  if (data === undefined) {
    data = {};
    if (create) {
      obj.__TCAD_CUSTOM_DATA = data;
    }
  }
  return data;
}