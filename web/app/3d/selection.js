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

  pick(object) {
    if (!this.contains(object)) {
      this.select(object);
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
  }
  
  select(sceneFace) {
    this.clear();
    if (!!sceneFace.curvedSurfaces) {
      for (var i = 0; i < sceneFace.curvedSurfaces.length; i++) {
        var face  = sceneFace.curvedSurfaces[i];
        this.selection.push(face);
        setFacesColor(face.meshFaces, this.readOnlyColor);
      }
    } else {
      this.selection.push(sceneFace);
      this.viewer.updateBasis(sceneFace.basis(), sceneFace.depth());
      this.viewer.showBasis();
      setFacesColor(sceneFace.meshFaces, this.selectionColor);
    }
    sceneFace.solid.mesh.geometry.colorsNeedUpdate = true;
    this.viewer.bus.notify('selection', sceneFace);
    this.viewer.render();
  }
  
  deselectAll() {
    this.clear();
    this.viewer.bus.notify('selection', null);
    this.viewer.render();
  }
  
  clear() {
    for (let selectee of this.selection) {
      setFacesColor(selectee.meshFaces, this.defaultColor);
      selectee.solid.mesh.geometry.colorsNeedUpdate = true;
    }
    this.viewer.hideBasis();
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
