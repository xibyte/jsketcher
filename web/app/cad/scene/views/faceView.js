import {setAttribute} from '../../../../../modules/scene/objectData';
import {brepFaceToGeom, tessDataToGeom} from '../wrappers/brepSceneObject';
import {FACE} from '../entites';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {SketchObjectView} from './sketchObjectView';
import {View} from './view';

export class SketchingView extends View {
  
  constructor(face) {
    super(face);
    this.sketchGroup = SceneGraph.createGroup();
    this.sketchObjectViews = [];
    this.rootGroup = SceneGraph.createGroup();
    SceneGraph.addToGroup(this.rootGroup, this.sketchGroup);
  }

  updateSketch() {
    SceneGraph.clearGroup(this.sketchGroup);
    this.disposeSketch();
    this.sketchObjectViews = [];

    const sketchTr =  this.model.sketchToWorldTransformation;
    for (let sketchObject of this.model.sketchObjects) {
      let sov = new SketchObjectView(sketchObject, sketchTr);
      SceneGraph.addToGroup(this.sketchGroup, sov.rootGroup);
    }
  }
  
  disposeSketch() {
    for (let sov of this.sketchObjectViews) {
      sov.dispose();
    }
  }

  dispose() {
    this.disposeSketch();
    super.dispose();
  }

}

export class FaceView extends SketchingView {
  
  constructor(face, geometry) {
    super(face);
    this.geometry = geometry;
    this.meshFaces = [];
    let off = geometry.faces.length;
    if (face.brepFace.data.tesselation) {
      tessDataToGeom(face.brepFace.data.tesselation.data, geometry)
    } else {
      brepFaceToGeom(face, geometry);
    }
    for (let i = off; i < geometry.faces.length; i++) {
      const meshFace = geometry.faces[i];
      this.meshFaces.push(meshFace);
      setAttribute(meshFace, FACE, this);
    }
  }
  
  mark(color) {
    this.setColor(color || SELECTION_COLOR);
  }

  withdraw(color) {
    this.setColor(null);
  }
  
  setColor(color) {
    setFacesColor(this.meshFaces, color);
    this.geometry.colorsNeedUpdate = true;
  }
}

export function setFacesColor(faces, color) {
  for (let face of faces) {
    if (color === null) {
      face.color.set(NULL_COLOR);
    } else {
      face.color.set( color );
    }
  }
}

export const NULL_COLOR = new THREE.Color();
export const SELECTION_COLOR = 0xFAFAD2;
