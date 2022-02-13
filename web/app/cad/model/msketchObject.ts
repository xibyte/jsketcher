import {MObject} from './mobject';
import {MFace} from "./mface";
import {EntityKind} from "cad/model/entities";
import Vector from "math/vector";
import {Segment} from "cad/sketch/sketchModel";
import Axis from "math/axis";

export class MSketchObject extends MObject {

  static TYPE = EntityKind.SKETCH_OBJECT;
  face: MFace;
  sketchPrimitive: any;
  construction: boolean;
  
  constructor(face, sketchPrimitive) {
    super(MSketchObject.TYPE, sketchPrimitive.id);
    this.face = face;
    this.sketchPrimitive = sketchPrimitive;
    this.construction = false;
  }

  get parent() {
    return this.face;
  }

  toDirection(): Vector {
    const tangent = (this.sketchPrimitive as Segment).tangentAtStart();
    return this.face.sketchToWorldTransformation.apply(tangent)._normalize();
  };

  toAxis(reverse: boolean): Axis {
    let seg = this.sketchPrimitive as Segment;
    let tan;
    let origin;
    if (reverse) {
      tan = seg.tangentAtStart();
      origin = seg.a;
    } else {
      tan = seg.tangentAtEnd();
      origin = seg.b;
    }
    tan = this.face.sketchToWorldTransformation.applyNoTranslation(tan)._normalize();
    origin = this.face.sketchToWorldTransformation.apply(origin);
    return new Axis(origin, tan);
  };

}