
export class TopoObject {

  data: {};
  op: OperationTemporaryData;

  constructor() {
    this.data = {};
    this.op = null;
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

export type OperationTemporaryData = any;

let REF_COUNTER = 0;