import {MObject} from './mobject';

export class MSketchObject extends MObject {

  static TYPE = 'sketchObject';
  
  constructor(face, sketchPrimitive) {
    super();
    this.id = sketchPrimitive.id;
    this.face = face;
    this.sketchPrimitive = sketchPrimitive;
    this.construction = false;
  }

}