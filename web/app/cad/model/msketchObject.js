import {MObject} from './mobject';

export class MSketchObject extends MObject {

  static TYPE = 'sketchObject';
  
  constructor(face, sketchPrimitive) {
    super(MSketchObject.TYPE, sketchPrimitive.id);
    this.face = face;
    this.sketchPrimitive = sketchPrimitive;
    this.construction = false;
  }

}