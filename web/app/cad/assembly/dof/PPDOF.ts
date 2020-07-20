import Vector, {ORIGIN} from "math/vector";
import {eqTol} from "geom/tolerance";
import {FaceTouchAlignConstraint} from "../constraints/faceTouchAlign";
import {Plane} from 'geom/impl/plane';
import {ANGULAR_ALLOWANCE, AssemblyDOF, ModificationResponse} from "./assemblyDOF";
import {clamp, DEG_RAD} from "math/commons";
import {ConflictDOF} from "./conflictDOF";
import {PPPPDOF} from "./PPPPDOF";
import {EdgeAlignConstraint} from "../constraints/edgeAlign";
import {Matrix3x4} from "math/matrix";
import {areEqual} from "math/equality";

export class PPDOF implements AssemblyDOF {

  description = 'plane to plane';

  plane: Plane;

  constructor(plane: Plane) {
    this.plane = plane;
  }

  rotate(axis: Vector, angle: number, location: Matrix3x4, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3x4, strict: boolean): ModificationResponse {

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

    const rot = new Matrix3x4();

    Matrix3x4.rotationFromVectorToVector(vecA, vecB,  ORIGIN, rot);

    rot.combine3x3(location, location);

    const ptMoving = constr.movingPart.location.apply(constr.movingFace.csys.origin);
    const ptFixed = constr.fixedPart.location.apply(constr.fixedFace.csys.origin);


    const wA = vecB.dot(ptMoving);
    const wB = vecB.dot(ptFixed);

    const dir = vecB.multiply(wB - wA);

    location.translateVec(dir);

    return new PPPPDOF(this.plane, new Plane(vecB.copy(), vecB.dot(ptFixed)));
  }

  applyEdgeAlign(constr: EdgeAlignConstraint): AssemblyDOF {



    return this;
  }

}