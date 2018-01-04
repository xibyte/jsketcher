import * as tk from '../../../../ui/toolkit.js'
import * as workbench from '../workbench'
import * as cad_utils from '../../../cad-utils'
import Vector from 'math/vector';
import {Matrix3, ORIGIN} from '../../../../math/l3space'
import {revolveToTriangles} from '../revolve'
import {OpWizard, IMAGINARY_SURFACE_MATERIAL, } from './wizard-commons'

export function RevolveWizard(app, face, initParams) {
  if (face.sketch3DGroup == null) app.refreshSketchOnFace(face);
  if (!initParams) this.DEFAULT_PARAMS[2] = findDefaultAxis(app, face);
  OpWizard.call(this, app.viewer, initParams);
  this.app = app;
  this.face = face;
  this.updatePolygons();
  this.synch();
  this.autoResoltion = true;
  this.selectionListener = () => {
    const object = this.app.viewer.sketchSelectionMgr.selection[0];
    if (canBePivot(object, this.face)) {
      this.ui.pivotSketchObjectId.input.val(object.__TCAD_SketchObject.id);
      this.synch();
    }
  };
  app.bus.subscribe('selection-sketch-object', this.selectionListener);
}

function canBePivot(sketchObject, face) {
  return sketchObject && isSketchSegment(sketchObject) && sketchObject.parent == face.sketch3DGroup;
}

function findDefaultAxis(app, face) {
  let line;
  const preSelected = app.viewer.sketchSelectionMgr.selection[0];
  if (canBePivot(preSelected, face)) {
    line = preSelected;
  } else {
    line = firstSegment(face.sketch3DGroup.children);
    if (line) {
      app.viewer.sketchSelectionMgr.select(line);
    }
  }
  if (!line) {
    alert("Sketch doesn't contain any segments which can be used as a revolve pivot");
    return undefined;
  } else {
    return line.__TCAD_SketchObject.id;
  }
}

function defaultResolution(angle) {
  return Math.max(2, Math.round(Math.abs(angle) / 4.0 ));
}

RevolveWizard.prototype = Object.create( OpWizard.prototype );

RevolveWizard.prototype.DEFAULT_PARAMS = [180, defaultResolution(180)];

RevolveWizard.prototype.title = function() {
  return "Revolve";
};

RevolveWizard.prototype.updatePolygons = function() {
  this.polygons = workbench.getSketchedPolygons3D(this.app, this.face);
};

RevolveWizard.prototype.update = function(angle, resolution, pivotSketchObjectId) {
  if (this.mesh) {
    this.mesh.geometry.dispose();
    this.previewGroup.remove(this.mesh);
  }
  
  const vertices = this.face.getSketchObjectVerticesIn3D(pivotSketchObjectId);
  if (!vertices) {
    console.log('illegal state');
    return;
  }
  const axis = [vertices[0], vertices[vertices.length-1]];
  const triangles = revolveToTriangles(this.polygons, axis, angle / 180 * Math.PI, resolution);
  const geometry = new THREE.Geometry();

  for (let tr of triangles) {
    const a = geometry.vertices.length;
    const b = a + 1;
    const c = a + 2;
    const face = new THREE.Face3(a, b, c);
    tr.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(face);
  }
  geometry.mergeVertices();
  geometry.computeFaceNormals();
  
  this.mesh = new THREE.Mesh(geometry, IMAGINARY_SURFACE_MATERIAL);
  this.previewGroup.add(this.mesh);
};

RevolveWizard.prototype.createUI = function (angle, resolution, axisObjectId) {
  const ui = this.ui;
  const folder = this.ui.folder;
  tk.add(ui.box, folder);
  ui.angle = tk.config(new tk.Number("Angle", angle, 5), {min: -360, max: 360, accelerator: 10});
  ui.resolution = tk.config(new tk.Number("Resolution", resolution), {min: 2, accelerator: 2});
  ui.pivotSketchObjectId = new tk.Text("Axis Object", axisObjectId === undefined ? "" : axisObjectId);
  
  ui.angle.input.on('t-change', () => {
    if (this.autoResoltion) {
      ui.resolution.input.val(defaultResolution ( parseFloat(ui.angle.input.val()) ));
    }
    this.synch();
  });
  ui.resolution.input.on('t-change', () => {
    this.autoResoltion = false;
    this.synch();
  });
  tk.add(folder, ui.angle);
  tk.add(folder, ui.resolution);
  tk.add(folder, ui.pivotSketchObjectId);
};

RevolveWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.app.viewer.render();
};

RevolveWizard.prototype.getParams = function() {
  const angleValue = parseFloat(this.ui.angle.input.val());
  const resolutionValue = parseFloat(this.ui.resolution.input.val());
  const pivotSketchObjectId = this.ui.pivotSketchObjectId.input.val();
  return [angleValue, resolutionValue, pivotSketchObjectId];
};

RevolveWizard.prototype.createRequest = function(done) {
  const params = this.getParams();
  done({
    type : 'REVOLVE',
    solids : [this.app.findSolidByCadId(this.face.solid.tCadId)],
    face : this.app.findFace(this.face.id),
    params : {
      angle: params[0],
      resolution: params[1],
      pivotSketchObjectId: params[2]
    },
    protoParams: params
  });
};

RevolveWizard.prototype.dispose = function() {
  this.app.bus.unsubscribe('selection-sketch-object', this.selectionListener);
  OpWizard.prototype.dispose.call(this);
};

function isSketchSegment(line) {
  return line.__TCAD_SketchObject && line.__TCAD_SketchObject._class === 'TCAD.TWO.Segment';
}
function firstSegment(objects) {
  for (let line of objects) {
    if (isSketchSegment(line)) {
      return line;
    }
  }
  return undefined;
}