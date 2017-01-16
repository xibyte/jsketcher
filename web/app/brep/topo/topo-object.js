
export class TopoObject {
  
  constructor() {
    this.role = '';
    this.data = {};
  }
  
  defineIterable(name, iteratorFactory) {
    this[name] = {};
    this[name][Symbol.iterator] = iteratorFactory;
  }
}