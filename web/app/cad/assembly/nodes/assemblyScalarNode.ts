import {AssemblyNode} from "../assembly";
import {Param} from "../../../sketcher/shapes/param";
import {MObject} from "../../model/mobject";

export class AssemblyScalarNode extends AssemblyNode {

  param: Param;
  getValue: () => number;

  constructor(model: MObject, debugSymbol: string, getValue: () => number) {
    super(model);
    this.param = new Param(0, debugSymbol);
    this.getValue = getValue;
  }

  reset() {
    this.param.set(this.getValue());
  }

  visitParams(cb) {
    cb(this.param);
  }

}