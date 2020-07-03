import Vector from "math/vector";
import {Matrix3} from "math/l3space";
import {FaceTouchAlignConstraint} from "../constraints/faceTouchAlign";


export enum ModificationResponse {

  SUCCESS, FIXED, REJECTED

}

export interface AssemblyDOF {

  description: string;

  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF;

  translate(dir: Vector, location: Matrix3, strict: boolean): ModificationResponse;

  rotate(axis: Vector, angle: number, location: Matrix3, strict: boolean): ModificationResponse;


}