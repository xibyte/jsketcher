
import { Matrix3 } from "math/l3space";
import Vector from "math/vector";
import { AssemblyConstraint } from '../assemblyConstraint';
import { FaceTouchAlignConstraint } from "../constraints/faceTouchAlign";
import { AssemblyDOF, ModificationResponse } from "./assemblyDOF";

export class ConflictDOF implements AssemblyDOF {

  description = 'conflicting';

  conflictingConstraint: AssemblyConstraint;
  infoMessage: string;

  constructor(conflictingConstraint: AssemblyConstraint, infoMessage: string) {
    this.conflictingConstraint = conflictingConstraint;
    this.infoMessage = infoMessage;
  }


  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {
    return this;
  }

  rotate(axis: Vector, angle: number, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

}