import Vector from "math/vector";
import { FaceTouchAlignConstraint } from "../constraints/faceTouchAlign";
import { Plane } from 'geom/impl/plane';
import { AssemblyDOF, ModificationResponse } from "./assemblyDOF";
import { ConflictDOF } from './conflictDOF';
import {EdgeAlignConstraint} from "../constraints/edgeAlign";
import {Matrix3x4} from "math/matrix";

export class PPPPDOF implements AssemblyDOF {

  plane1: Plane;
  plane2: Plane;
  description = 'plane to plane twice';

  constructor(plane1: Plane, plane2: Plane) {
    this.plane1 = plane1;
    this.plane2 = plane2;
  }

  rotate(axis: Vector, angle: number, location: Matrix3x4, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3x4, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }


  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {
    return new ConflictDOF(constr, 'plane touch/align constraint cannot be applied when object is at ' + this.description + ' relationship');
  }

  applyEdgeAlign(constr: EdgeAlignConstraint): AssemblyDOF {
    return this;
  }

}