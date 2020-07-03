import {Matrix3, ORIGIN} from "math/l3space";
import Vector from "math/vector";
import {eqTol} from "../../../brep/geom/tolerance";
import {FaceTouchAlignConstraint} from "../constraints/faceTouchAlign";
import {Plane} from './../../../brep/geom/impl/plane';
import {AssemblyDOF, ModificationResponse} from "./assemblyDOF";
import {areEqual, clamp, DEG_RAD} from "../../../math/math";
import {ConflictDOF} from "./conflictDOF";

const ANGULAR_ALLOWANCE = 10 * DEG_RAD;

export class PPDOF implements AssemblyDOF {

  description = 'plane to plane';

  plane: Plane;

  constructor(plane: Plane) {
    this.plane = plane;
  }


  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {

    const rotationAxis = this.plane.normal;

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
      return new ConflictDOF(constr, 'unable to align faces with not matching angles with respect to plane to plane align degree of freedom');
    }  

    const location = constr.movingPart.root.location;

    const rot = new Matrix3();

    Matrix3.rotationFromVectorToVector(vecA, vecB,  ORIGIN, rot);

    rot.combine3x3(location, location);

    const ptMoving = constr.movingPart.location.apply(constr.movingFace.csys.origin);
    const ptFixed = constr.fixedPart.location.apply(constr.fixedFace.csys.origin);


    const wA = vecB.dot(ptMoving);
    const wB = vecB.dot(ptFixed);

    const dir = vecB.multiply(wB - wA);

    location.translateVec(dir);

    return this;
  }

  rotate(axis: Vector, angle: number, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3, strict: boolean): ModificationResponse {

    const normal = this.plane.normal;
    const illegalTranslation = !eqTol(normal.dot(dir), 0);
    if (illegalTranslation && strict) {
      return ModificationResponse.REJECTED;
    }

    //fix it anyway to mitigate any rounding errors

    debugger;

    const y = normal.cross(dir)._normalize();
    const x = y.cross(normal)._normalize();

    const u = x.dot(dir);
    const fixedDir = x._multiply(u);

    location.translateVec(fixedDir);

    return illegalTranslation ? ModificationResponse.FIXED : ModificationResponse.SUCCESS;
  }

}