import Vector from '../../../../../modules/math/vector';
import {setAttribute} from '../../../../../modules/scene/objectData';
import {FACE, SHELL} from '../entites';
import {SELECTION_COLOR, setFacesColor, SketchingView} from './faceView';
import {View} from './view';

const INIT_WIDTH_H  = 750 * 0.5;
const INIT_HEIGHT_H = 750 * 0.5;

export const INIT_BOUNDS = [
  new Vector(-INIT_WIDTH_H, -INIT_HEIGHT_H, 0),
  new Vector( INIT_WIDTH_H, -INIT_HEIGHT_H, 0),
  new Vector( INIT_WIDTH_H,  INIT_HEIGHT_H, 0),
  new Vector(-INIT_WIDTH_H,  INIT_HEIGHT_H, 0)
];


export class OpenFaceShellView extends View {

  constructor(shell) {
    super(shell);
    this.openFace = new OpenFaceView(shell.face);
    setAttribute(this.rootGroup, SHELL, this)
  }
  
  get rootGroup() {
    return this.openFace.rootGroup
  }
  
  dispose() {
    this.openFace.dispose();
  }
}

export class OpenFaceView extends SketchingView {

  constructor(mFace) {
    super(mFace);
    this.material = new THREE.MeshPhongMaterial({
      vertexColors: THREE.FaceColors,
      color: 0xB0C4DE,
      shininess: 0,
      polygonOffset : true,
      polygonOffsetFactor : 1,
      polygonOffsetUnits : 2,
      side : THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.updateBounds(INIT_BOUNDS);
  }

  dropGeometry() {
    if (this.mesh) {
      this.rootGroup.remove( this.mesh );
      this.mesh.geometry.dispose();
    }
  }

  createGeometry() {
    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.bounds.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(0, 2, 3));
    geometry.faces.forEach(f => setAttribute(f, FACE, this));
    geometry.computeFaceNormals();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.rootGroup.add(this.mesh);
  }

  updateBounds(bounds2d) {
    this.dropGeometry();
    const tr = this.model.sketchToWorldTransformation;
    this.bounds = bounds2d.map(v => tr.apply(v));
    this.createGeometry();
  }

  updateSketch() {
    super.updateSketch();
    // let bounds2d = ... 
    // for (let mSketchObject of this.model.sketchObjects) {
    //    mSketchObject.sketchPrimitive.tessellate(...to bounds2d)
    // }
    // this.updateBounds(bounds2d)
  }

  mark(color) {
    this.setColor(color || SELECTION_COLOR);
  }

  withdraw(color) {
    this.setColor(null);
  }

  setColor(color) {
    setFacesColor(this.mesh.geometry.faces, color);
    this.mesh.geometry.colorsNeedUpdate = true;
  }

  dispose() {
    this.dropGeometry();
    this.material.dispose();
    super.dispose();
  }
}