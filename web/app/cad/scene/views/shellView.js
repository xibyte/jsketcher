import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {getAttribute, setAttribute} from 'scene/objectData';
import {FaceView, SELECTION_COLOR} from './faceView';
import {EdgeView} from './edgeView';
import {FACE, LOOP, SHELL} from '../../model/entities';
import {Mesh} from 'three';
import {VertexView} from "./vertexView";
import {MSketchLoop} from "cad/model/mloop";

export class ShellView extends View {

  constructor(ctx, shell, skin) {
    super(ctx, shell);

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

    for (const face of shell.faces) {
      const faceView = new FaceView(ctx, face, this, skin);
      this.faceViews.push(faceView);
      this.rootGroup.add(faceView.rootGroup);
    }

    for (const edge of shell.edges) {
      const edgeView = new EdgeView(ctx, edge);
      SceneGraph.addToGroup(this.edgeGroup, edgeView.rootGroup);
      this.edgeViews.push(edgeView);
    }

    for (const vertex of shell.vertices) {
      const vertexView = new VertexView(ctx, vertex);
      SceneGraph.addToGroup(this.vertexGroup, vertexView.rootGroup);
      this.vertexViews.push(vertexView);
    }
    this.rootGroup.matrixAutoUpdate = false;

    this.model.location$.attach(loc => {
      loc.setToMatrix4x4(this.rootGroup.matrix);
      this.rootGroup.matrixWorldNeedsUpdate = true;
      ctx.viewer.requestRender();
    });

  }

  traverse(visitor, includeSelf = true) {
    super.traverse(visitor, includeSelf);
    this.faceViews.forEach(f => f.traverse(visitor));
    this.edgeViews.forEach(e => e.traverse(visitor));
    this.vertexViews.forEach(e => e.traverse(visitor));
  }

  updateVisuals() {
    super.updateVisuals();
    this.faceViews.forEach(f => f.updateVisuals());
  }

  dispose() {
    for (const faceView of this.faceViews) {
      faceView.dispose();
    }
    for (const edgeView of this.edgeViews) {
      edgeView.dispose();
    }
    for (const vertexView of this.vertexViews) {
      vertexView.dispose();
    }
    super.dispose();
  }
}

export class SketchMesh extends Mesh {
  
  constructor(geometry, material) {
    super(geometry, material);
  }

}