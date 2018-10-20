import {View} from './view';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {setAttribute} from '../../../../../modules/scene/objectData';
import {createSolidMaterial} from '../wrappers/sceneObject';
import {FaceView} from './faceView';
import {EdgeView} from './edgeView';
import {SHELL} from '../entites';

export class ShellView extends View {

  constructor(shell, skin) {
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
    this.mesh = new THREE.Mesh(geometry, this.material);
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
  }    
  
  dispose() {
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