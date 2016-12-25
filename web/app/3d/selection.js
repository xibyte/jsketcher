import DPR from '../utils/dpr'

class AbstractSelectionManager {
  
  constructor(viewer) {
    this.viewer = viewer;
    this.selection = [];
    this.viewer.bus.subscribe('craft', () => this.deselectAll());
  }

  contains(face) {
    return this.selection.indexOf(face) != -1;
  }

  pick(sketchFace) {
    if (!this.contains(sketchFace)) {
      this.select(sketchFace);
      return true;
    }
    return false;
  }
  
  select() {
    throw "AbstractFunctionCall";
  }
  
  deselectAll() {
    throw "AbstractFunctionCall";
  }
}

export class SketchSelectionManager extends AbstractSelectionManager {
  
  constructor (viewer, selectionMaterial) {
    super(viewer);
    this.selectionMaterial = selectionMaterial;
    this.defaultMaterials = [];
  }
  
  select(line) {
    this._clearSilent();
    this.defaultMaterials.push(line.material);
    this.selection.push(line);
    line.material = this.selectionMaterial;
    this.notify();
    this.viewer.render();
  }

  deselectAll() {
    this.clear();
  }
  
  clear() {
    this._clearSilent();
    this.notify();
    this.viewer.render();
  }
  
  _clearSilent() {
    for (let i = 0; i < this.selection.length; i++) {
      this.selection[i].material = this.defaultMaterials[i];
    }
    this.defaultMaterials.length = 0;
    this.selection.length = 0;
  }
  
  notify() {
    this.viewer.bus.notify('selection-sketch-object');
  }
}

export class SelectionManager extends AbstractSelectionManager {
  
  constructor(viewer, selectionColor, readOnlyColor, defaultColor) {
    super(viewer);
    this.selectionColor = selectionColor;
    this.defaultColor = defaultColor;
    this.readOnlyColor = readOnlyColor;
    this.planeSelection = [];
  
    this.basisGroup = new THREE.Object3D();
    var length = 200;
    var arrowLength = length * 0.2;
    var arrowHead = arrowLength * 0.4;
  
    function createArrow(axis, color) {
      var arrow = new THREE.ArrowHelper(axis, new THREE.Vector3(0, 0, 0), length, color, arrowLength, arrowHead);
      arrow.updateMatrix();
      arrow.matrixAutoUpdate = false;
      arrow.line.renderOrder = 1e11;
      arrow.cone.renderOrder = 1e11;
      arrow.line.material.linewidth =  1/DPR;
      arrow.line.material.depthWrite = false;
      arrow.line.material.depthTest = false;
      arrow.cone.material.depthWrite = false;
      arrow.cone.material.depthTest = false;
      return arrow;
    }
  
    var xAxis = createArrow(new THREE.Vector3(1, 0, 0), 0xFF0000);
    var yAxis = createArrow(new THREE.Vector3(0, 1, 0), 0x00FF00);
    this.basisGroup.add(xAxis);
    this.basisGroup.add(yAxis);
  }
  
  updateBasis(basis, depth) {
    this.basisGroup.matrix.identity();
    var mx = new THREE.Matrix4();
    mx.makeBasis(basis[0].three(), basis[1].three(), basis[2].three());
    var depthOff = new THREE.Vector3(0, 0, depth);
    depthOff.applyMatrix4(mx);
    mx.setPosition(depthOff);
    this.basisGroup.applyMatrix(mx);
  }
  
  
  select(sketchFace) {
    this.clear();
    if (sketchFace.curvedSurfaces !== null) {
      for (var i = 0; i < sketchFace.curvedSurfaces.length; i++) {
        var face  = sketchFace.curvedSurfaces[i];
        this.selection.push(face);
        setFacesColor(face.faces, this.readOnlyColor);
      }
    } else {
      this.selection.push(sketchFace);
      this.updateBasis(sketchFace.basis(), sketchFace.depth());
      sketchFace.solid.cadGroup.add(this.basisGroup);
      setFacesColor(sketchFace.faces, this.selectionColor);
    }
    sketchFace.solid.mesh.geometry.colorsNeedUpdate = true;
    this.viewer.bus.notify('selection', sketchFace);
    this.viewer.render();
  }
  
  deselectAll() {
    this.clear();
    this.viewer.bus.notify('selection', null);
    this.viewer.render();
  }
  
  clear() {
    for (let selectee of this.selection) {
      setFacesColor(selectee.faces, this.defaultColor);
      selectee.solid.mesh.geometry.colorsNeedUpdate = true;
    }
    if (this.basisGroup.parent !== null ) this.basisGroup.parent.remove( this.basisGroup );
    this.selection.length = 0;
  }
}

function setFacesColor(faces, color) {
  for (let face of faces) {
    if (color == null) {
      face.color.set(new THREE.Color());
    } else {
      face.color.set( color );
    }
  }
}

