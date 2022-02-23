export const EMPTY_OBJECT = Object.freeze({});

export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}


export function traverseObject(root, callback) {

  const stack = [root];

  while (stack.length !== 0) {

    const obj = stack.pop();

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === 'object') {
          stack.push(item)
        }
      });
    } else if (obj && typeof obj === 'object') {
      callback(obj);
      Object.keys(obj).forEach(key => {
        const item = obj[key];
        if (typeof item === 'object') {
          stack.push(item);
        }
      })
    }
  }
}

export const allPropsDefined = obj => Object.values(obj).every(x => !!x);