import {Index} from "gems/indexType";

export function createIndex<T>(arr: T[], indexProp: (item) => string): Index<T> {
  return arr.reduce((index, item) => {
    index[indexProp(item)] = item;
    return index;
  }, {})
}