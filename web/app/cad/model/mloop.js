import {MObject} from './mobject';

export class MLoop extends MObject {
  
  static TYPE = 'loop';

  constructor(id) {
    super(MLoop.TYPE, id);
  }

}

export class MSketchLoop extends MObject {

  static TYPE = 'loop';

  constructor(id, face, sketchObjects, contour) {
    super(id);
    this.face = face;
    this.sketchObjects = sketchObjects;
    this.contour = contour;
  }

}

