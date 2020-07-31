import {setAttribute} from 'scene/objectData';
import {brepFaceToGeom, tessDataToGeom} from '../wrappers/brepSceneObject';
import {FACE} from '../entites';
import * as SceneGraph from 'scene/sceneGraph';
import {SketchObjectView} from './sketchObjectView';
import {View} from './view';
import {SketchLoopView} from './sketchLoopView';

export class SketchingView extends View {
  
  constructor(face) {
    super(face);
    this.sketchGroup = SceneGraph.createGroup();
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
    this.rootGroup = SceneGraph.createGroup();
    SceneGraph.addToGroup(this.rootGroup, this.sketchGroup);
    this.updateSketch();
  }

  updateSketch() {
    SceneGraph.emptyGroup(this.sketchGroup);
    this.disposeSketch();

    const sketchTr =  this.model.sketchToWorldTransformation;
    for (let sketchObject of this.model.sketchObjects) {
      let sov = new SketchObjectView(sketchObject, sketchTr);
      SceneGraph.addToGroup(this.sketchGroup, sov.rootGroup);
      this.sketchObjectViews.push(sov);
    }
    this.model.sketchLoops.forEach(mLoop => {
      let loopView = new SketchLoopView(mLoop);
      SceneGraph.addToGroup(this.sketchGroup, loopView.rootGroup);
      this.sketchLoopViews.push(loopView);  
    });
  }
  
  disposeSketch() {
    this.sketchObjectViews.forEach(o => o.dispose());
    this.sketchLoopViews.forEach(o => o.dispose());
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
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
    if (face.brepFace.data.tessellation) {
      tessDataToGeom(face.brepFace.data.tessellation.data, geometry)
    } else {
      brepFaceToGeom(face.brepFace, geometry);
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
