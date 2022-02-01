import {MObject} from './mobject';
import {MFace} from "./mface";
import {EntityKind} from "cad/model/entities";

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

}