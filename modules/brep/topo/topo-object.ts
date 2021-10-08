
export class TopoObject {

  data: any;
  op: OperationTemporaryData;

  constructor() {
    this.data = {};
    this.op = null;
    Object.defineProperty(this, "refId", {
      value: REF_COUNTER ++,
      writable: false
    });
  }
  
}

export type OperationTemporaryData = any;

let REF_COUNTER = 0;