import {MObject} from './mobject';
import {MFace} from "./mface";
import {EntityKind} from "cad/model/entities";
import Vector from "math/vector";
import {Segment} from "cad/sketch/sketchModel";

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
    return this.face.sketchToWorldTransformation.apply(tangent);
  };

}