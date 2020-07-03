import { Plane } from './../../../brep/geom/impl/plane';
import {AssemblyDOF, ModificationResponse} from "./assemblyDOF";
import Vector from "math/vector";
import {Matrix3, ORIGIN} from "math/l3space";
import {FaceTouchAlignConstraint} from "../constraints/faceTouchAlign";
import {PPDOF} from "./PPDOF";

export class SixDOF implements AssemblyDOF {

  description = 'full freedom';

  applyTouchAlign(constr: FaceTouchAlignConstraint): AssemblyDOF {

    const vecA = constr.movingPart.location.applyNoTranslation(constr.movingFace.normal());
    const vecB = constr.fixedPart.location.applyNoTranslation(constr.fixedFace.normal())._negate();

    const location = constr.movingPart.root.location;

    Matrix3.rotationFromVectorToVector(vecA, vecB, ORIGIN, location);

    const ptFixed = constr.fixedPart.location.apply(constr.fixedFace.favorablePoint);
    const ptMoving = constr.movingPart.location.apply(constr.movingFace.favorablePoint);

    const dir = ptFixed._minus(ptMoving);

    location.translate(dir.x, dir.y, dir.z);

    return new PPDOF(new Plane(vecB.copy(), vecB.dot(ptFixed)));
  }

  rotate(axis: Vector, angle: number, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

  translate(dir: Vector, location: Matrix3, strict: boolean): ModificationResponse {
    return ModificationResponse.REJECTED;
  }

}