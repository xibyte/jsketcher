import {Param} from "../shapes/param";

export class SolverParam {

  value: number;
  objectParam: Param;
  constant: boolean;

  /**
   * Jacobian position
   */
  j: number;

  constructor(value, objectParam) {
    this.reset(value);
    this.objectParam = objectParam;
  }

  reset(value) {
    this.set(value);
    this.constant = false;
    this.j = -1;
  };

  set(value) {
    if (this.constant) return;
    this.value = value;
  };

  get() {
    return this.value;
  }

  rollback() {
    this.set(this.objectParam.get());
  }

}

