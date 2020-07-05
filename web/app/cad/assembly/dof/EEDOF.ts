import {Matrix3, ORIGIN} from "math/l3space";
import Vector from "math/vector";
import {eqTol} from "../../../brep/geom/tolerance";
import {FaceTouchAlignConstraint} from "../constraints/faceTouchAlign";
import {Plane} from './../../../brep/geom/impl/plane';
import {AssemblyDOF, ModificationResponse} from "./assemblyDOF";
import {areEqual, clamp, DEG_RAD} from "../../../math/math";
import {ConflictDOF} from "./conflictDOF";
import {PPPPDOF} from "./PPPPDOF";
import {EdgeAlignConstraint} from "../constraints/edgeAlign";
import {PPEEDOF} from "./PPEEDOF";
import {EEEEDOF} from "./EEEEDOF";

const ANGULAR_ALLOWANCE = 10 * DEG_RAD;

export class EEDOF implements AssemblyDOF {

  description = 'edge to edge';

  origin: Vector;
  dir: Vector;

  constructor(origin: Vector, dir: Vector) {
    this.origin = origin;
    this.dir = dir;
  }

  rotate(axis: Vector, angle: number, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {

    const rotationAxis = this.dir;

    const vecA = constr.movingPart.location.applyNoTranslation(constr.movingFace.normal()).normalize();
    const vecB = constr.fixedPart.location.applyNoTranslation(constr.fixedFace.normal())._negate().normalize();

    const cosA = clamp(rotationAxis.dot(vecA), -1, 1);
    const cosB = clamp(rotationAxis.dot(vecB), -1, 1);
    const sinA = clamp(rotationAxis.cross(vecA).length(), -1, 1);
    const sinB = clamp(rotationAxis.cross(vecB).length(), -1, 1);

    const angA = Math.atan2(sinA, cosA);
    const angB = Math.atan2(sinB, cosB);

    // it's not a tolerance
    if (!areEqual(angA, angB, ANGULAR_ALLOWANCE)) {
      console.log('constraint conflict');
      return new ConflictDOF(constr, 'unable to align faces with not matching angles with respect to locking edge');
    }

    const location = constr.movingPart.root.location;

    const rot = new Matrix3();

    Matrix3.rotationFromVectorToVector(vecA, vecB, this.origin, rot);

    rot.combine(location, location);

    return new PPEEDOF(null, null);
  }

  applyEdgeAlign(constr: EdgeAlignConstraint): AssemblyDOF {

    const vecA = constr.movingPart.location.applyNoTranslation(constr.movingEdge.brepEdge.halfEdge1.tangentAtStart());
    const vecB = constr.fixedPart.location.applyNoTranslation(constr.fixedEdge.brepEdge.halfEdge1.tangentAtStart());
    if (vecA.dot(vecB)< 0) {
      vecB._negate();
    }
    const rotationAxis = this.dir;

    const angle1 = rotationAxis.angleBetween(vecA);
    const angle2 = rotationAxis.angleBetween(vecB);

    if (!areEqual(angle1, angle2, ANGULAR_ALLOWANCE)) {
      console.log('constraint conflict');
      return new ConflictDOF(constr, 'unable to align not matching angles edges with respect to locking edge');
    }

    const location = constr.movingPart.root.location;

    const rot = new Matrix3();

    Matrix3.rotationFromVectorToVector(vecA, vecB, this.origin, rot);

    rot.combine(location, location);


    const ptFixed = constr.fixedPart.location.apply(constr.fixedEdge.favorablePoint);
    const ptMoving = constr.movingPart.location.apply(constr.movingEdge.favorablePoint);

    const dir = ptFixed._minus(ptMoving);

    // constr.movingPart.location.translateVec(dir);

    return new EEEEDOF(this.origin, this.dir, constr.fixedEdge.favorablePoint, vecB);
  }

}