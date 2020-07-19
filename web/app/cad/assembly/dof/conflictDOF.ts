
import Vector from "math/vector";
import { AssemblyConstraint } from '../assemblyConstraint';
import { FaceTouchAlignConstraint } from "../constraints/faceTouchAlign";
import { AssemblyDOF, ModificationResponse } from "./assemblyDOF";
import {EdgeAlignConstraint} from "../constraints/edgeAlign";
import {Matrix3x4} from "math/matrix";

export class ConflictDOF implements AssemblyDOF {

  description = 'conflicting';

  conflictingConstraint: AssemblyConstraint;
  infoMessage: string;

  constructor(conflictingConstraint: AssemblyConstraint, infoMessage: string) {
    this.conflictingConstraint = conflictingConstraint;
    this.infoMessage = infoMessage;
  }

  rotate(axis: Vector, angle: number, location: Matrix3x4, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3x4, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {
    return this;
  }

  applyEdgeAlign(constr: EdgeAlignConstraint): AssemblyDOF {
    return this;
  }

}