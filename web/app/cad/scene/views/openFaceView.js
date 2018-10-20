import {setAttribute} from '../../../../../modules/scene/objectData';
import {FACE, SHELL} from '../entites';
import {NULL_COLOR, SELECTION_COLOR, setFacesColor, SketchingView} from './faceView';
import {View} from './view';

export class OpenFaceShellView extends View {

  constructor(shell) {
    super(shell);
    this.openFace = new OpenFaceView(shell.face);
    setAttribute(this.rootGroup, SHELL, this);
    setAttribute(this.rootGroup, View.MARKER, this);
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
    this.updateBounds();
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

  updateBounds() {
    let markedColor = this.color;
    this.dropGeometry();
    
    let bounds2d = [];
    for (let mSketchObject of this.model.sketchObjects) {
      mSketchObject.sketchPrimitive.tessellate().forEach(p => bounds2d.push(p));
    }
    let surface = this.model.shell.surfacePrototype.boundTo(bounds2d, 750, 750, 50);
    this.bounds = [surface.southWestPoint(), surface.southEastPoint(), 
      surface.northEastPoint(), surface.northWestPoint()]; 

    this.createGeometry();
    if (markedColor) {
      this.mark(markedColor);
    }
  }

  updateSketch() {
    super.updateSketch();
    this.updateBounds();
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
  
  get color() {
    let face = this.mesh && this.mesh.geometry && this.mesh.geometry.faces[0];
    if (face) {
      return face.color === NULL_COLOR ? null : face.color;
    }
    return null;
  }

  dispose() {
    this.dropGeometry();
    this.material.dispose();
    super.dispose();
  }
}