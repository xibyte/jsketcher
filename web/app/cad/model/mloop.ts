import {MObject} from './mobject';
import {MFace} from "./mface";
import {MSketchObject} from "./msketchObject";

export class MLoop extends MObject {
  
  static TYPE = 'loop';

  constructor(id) {
    super(MLoop.TYPE, id);
  }

}

export class MSketchLoop extends MLoop {
  face: MFace;
  sketchObjects: MSketchObject[];
  contour: any;

  constructor(id, face, sketchObjects, contour) {
    super(id);
    this.face = face;
    this.sketchObjects = sketchObjects;
    this.contour = contour;
  }

}

