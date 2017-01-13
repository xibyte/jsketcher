
export class TopoObject {
  
  constructor() {
    this.debugName = '';
    this.data = {};
  }
  
  defineIterable(name, iteratorFactory) {
    this[name] = {};
    this[name][Symbol.iterator] = iteratorFactory;
  }
}