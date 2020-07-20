import Vector from "math/vector";
import { FaceTouchAlignConstraint } from "../constraints/faceTouchAlign";
import { Plane } from 'geom/impl/plane';
import { AssemblyDOF, ModificationResponse } from "./assemblyDOF";
import { ConflictDOF } from './conflictDOF';
import {EdgeAlignConstraint} from "../constraints/edgeAlign";
import {Matrix3x4} from "math/matrix";

export class EEEEDOF implements AssemblyDOF {

  description = 'edge to edge twice';
  origin1: Vector;
  dir1: Vector;
  origin2: Vector;
  dir2: Vector;

  constructor(origin1: Vector, dir1: Vector, origin2: Vector, dir2: Vector) {
    this.origin1 = origin1;
    this.dir1 = dir1;
    this.origin2 = origin2;
    this.dir2 = dir2;
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