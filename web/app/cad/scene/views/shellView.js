import {View} from './view';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {getAttribute, setAttribute} from '../../../../../modules/scene/objectData';
import {createSolidMaterial} from '../wrappers/sceneObject';
import {FaceView, SELECTION_COLOR} from './faceView';
import {EdgeView} from './edgeView';
import {FACE, SHELL} from '../entites';
import {Mesh} from 'three';

export class ShellView extends View {

  constructor(shell, skin, viewer) {
    super(shell);

    this.material = createSolidMaterial(skin);
    this.rootGroup = SceneGraph.createGroup();
    this.edgeGroup = SceneGraph.createGroup();
    this.vertexGroup = SceneGraph.createGroup();
    this.faceViews = [];
    this.edgeViews = [];
    this.vertexViews = [];

    SceneGraph.addToGroup(this.rootGroup, this.edgeGroup);
    SceneGraph.addToGroup(this.rootGroup, this.vertexGroup);

    setAttribute(this.rootGroup, SHELL, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.mesh = new SketchMesh(geometry, this.material);
    // this.mesh.visible  = false;
    this.rootGroup.add(this.mesh);
    

    const geom = this.mesh.geometry;
    for (let face of shell.faces) {
      const faceView = new FaceView(face, geom);
      this.faceViews.push(faceView);
      this.rootGroup.add(faceView.rootGroup);
    }
    geom.mergeVertices();

    for (let edge of shell.edges) {
      const edgeView = new EdgeView(edge);
      SceneGraph.addToGroup(this.edgeGroup, edgeView.rootGroup);
      this.edgeViews.push(edgeView);
    }

    this.rootGroup.matrixAutoUpdate = false;

    this.model.location$.attach(loc => {
      loc.setToMatrix(this.rootGroup.matrix);
      this.rootGroup.matrixWorldNeedsUpdate = true;
      viewer.requestRender();
    });

  }

  mark(color) {
    this.faceViews.forEach(faceView => faceView.setColor(color || SELECTION_COLOR));
  }

  withdraw(color) {
    this.faceViews.forEach(faceView => faceView.setColor(null));
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.geometry.dispose();
    for (let faceView of this.faceViews) {
      faceView.dispose();
    }
    for (let edgeView of this.edgeViews) {
      edgeView.dispose();
    }
    for (let vertexView of this.vertexViews) {
      vertexView.dispose();
    }
    super.dispose();
  }
}

export class SketchMesh extends Mesh {
  
  constructor(geometry, material) {
    super(geometry, material);
  }

  passRayCast(hits) {
    for (let hit of hits) {
      if (hit.object === this && hit.face) {
        let faceView = getAttribute(hit.face, FACE);
        if (faceView) {
          if (faceView.sketchLoopViews.find(v => hits.find(h => v.mesh.geometry.faces.indexOf(h.face) !== -1))) {
            return true;
          }
        }

      }
    }
  }
  
  passMouseEvent(e) {
    return this.passRayCast(e.hits);
  };

}