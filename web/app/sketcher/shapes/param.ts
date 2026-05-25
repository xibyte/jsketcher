import {Generator} from "../id-generator";
import {SolverParam} from "../constr/solverParam";

export class Param {

  id: number;
  value: number;
  solverParam: SolverParam;
  private readonly debugSymbol: string;
  normalizer: ((value: number) => number) | undefined;
  enforceVisualLimit: boolean = false;

  //penalty function constraints
  constraints?: any[];

  constructor(value: number | undefined, debugSymbol?: string) {
    this.id = Generator.genID();
    this.value = value ?? 0;
    this.solverParam = new SolverParam(value ?? 0, this);
    this.debugSymbol = debugSymbol || 'X';
  }

  set(value: number) {
    this.value = value;
  }

  get() {
    return this.value;
  }

  toString() {
    return this.debugSymbol + this.id;
  }

  visitParams(callback: (param: Param) => void) {
    callback(this);
  }

}