import {Generator} from "../id-generator";
import {Param as SolverParam} from '../constr/solver';

export class Param {

  constructor(value, debugSymbol) {
    this.id = Generator.genID();
    this.value = value;
    this.solverParam = new SolverParam(value, this);
    this.debugSymbol = debugSymbol || 'X';
  }

  set(value) {
    this.value = value;
  }

  get() {
    return this.value;
  }

  toString() {
    return this.debugSymbol + this.id;
  }

  visitParams(callback) {
    callback(this);
  }

}