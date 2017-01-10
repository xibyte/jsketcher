
export function iterable(obj, name, iteratorFactory) {
  obj[name] = {};
  obj[name][Symbol.iterator] = iteratorFactory;
}