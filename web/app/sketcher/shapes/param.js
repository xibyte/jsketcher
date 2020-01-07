import {Generator} from "../id-generator";
import {Param as SolverParam} from '../constr/solver';

export class Param {

  constructor(value) {
    this.id = Generator.genID();
    this.value = value;
    this.solverParam = new SolverParam(value, this);
  }

  set(value) {
    this.value = value;
  }

  get() {
    return this.value;
  }

}