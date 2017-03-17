
export class TopoObject {
  
  constructor() {
    this.role = '';
    this.data = {};
    Object.defineProperty(this, "refId", {
      value: REF_COUNTER ++,
      writable: false
    });
  }
  
  defineIterable(name, iteratorFactory) {
    this[name] = {};
    this[name][Symbol.iterator] = iteratorFactory;
  }
}

let REF_COUNTER = 0;