import DPR from '../utils/dpr'
import * as approx from '../brep/approx'

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

export class EdgeSelectionManager extends AbstractSelectionManager {

  constructor (viewer, selectionMaterial) {
    super(viewer);
    this.selectionMaterial = selectionMaterial;
    this.defaultMaterials = [];
  }

  select(line) {
    this._clearSilent();
    const edge = line.__TCAD_EDGE;
    const approxCurve = edge.data[approx.EDGE_CHUNK];
    if (approxCurve) {
      for (let edgeChunk of approxCurve.edges) {
        this.mark(edgeChunk.data['scene.edge']);
      }
    } else {
      this.mark(line);
    }
    this.notify();
    this.viewer.render();
  }

  mark(line) {
    this.defaultMaterials.push(line.material);
    this.selection.push(line);
    line.material = this.selectionMaterial;
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
    //this.viewer.bus.notify('selection-edge');
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
    const group = this.findGroup(sceneFace);
    if (group) {
      for (var i = 0; i < group.length; i++) {
        var face  = group[i];
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
  
  findGroup(sceneFace) {
    if (sceneFace.curvedSurfaces) {
      return sceneFace.curvedSurfaces;
    }
    if (sceneFace.brepFace) {
      const approxFace = sceneFace.brepFace.data[approx.FACE_CHUNK];
      if (approxFace) {
        return approxFace.faces.map(f => f.data['scene.face']);
      }
    }
    return undefined;
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
