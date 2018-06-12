
export function setAttribute(obj, key, value) {
  getData(obj)[key] = value;
}

export function getAttribute(obj, key) {
  return getData(obj)[key];
}

export function unsetAttribute(obj, key) {
  delete getData(obj)[key];
}

export function getData(obj) {
  let data = obj.__TCAD_CUSTOM_DATA;
  if (data === undefined) {
    data = {};
    obj.__TCAD_CUSTOM_DATA = data;
  }
  return data;
}