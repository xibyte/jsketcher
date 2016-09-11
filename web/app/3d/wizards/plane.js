import {AXIS, IDENTITY_BASIS} from '../../math/l3space'
import * as tk from '../../ui/toolkit.js'
import {FACE_COLOR} from '../cad-utils'
import {addOkCancelLogic} from './wizard-commons'

export function PlaneWizard(viewer, initParams) {
  this.previewGroup = new THREE.Object3D();
  this.viewer = viewer;
  addOkCancelLogic(this);
  viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.plane = this.createPlane());
  this.operationParams = {
    basis : IDENTITY_BASIS,
    depth : 0
  };
  if (!initParams) {
    initParams = PlaneWizard.DEFAULT_PARAMS;
  }
  this.ui = {};
  this.createUI.apply(this, initParams);
  this.synch();
}

PlaneWizard.DEFAULT_PARAMS = ['XY', 0];

PlaneWizard.prototype.createPlane = function() {
  var geometry = new THREE.PlaneGeometry(750,750,1,1,1);
  var material = new THREE.MeshLambertMaterial( { color : FACE_COLOR, transparent: true, opacity:0.5, side: THREE.DoubleSide });
  return new THREE.Mesh(geometry, material);
};

PlaneWizard.prototype.update = function(orientation, w) {
  if (orientation === 'XY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = 0;
    this.plane.position.z = w;
    this.operationParams.basis = IDENTITY_BASIS;
  } else if (orientation === 'XZ') {
    this.plane.rotation.x = Math.PI / 2;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = w;
    this.plane.position.z = 0;
    this.operationParams.basis = [AXIS.X, AXIS.Z, AXIS.Y];
  } else if (orientation === 'ZY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = Math.PI / 2;
    this.plane.rotation.z = 0;
    this.plane.position.x = w;
    this.plane.position.y = 0;
    this.plane.position.z = 0;
    this.operationParams.basis = [AXIS.Z, AXIS.Y, AXIS.X];
  } else {
    throw orientation + " isn't supported yet";
  }
  this.operationParams.depth = w;
  this.viewer.render();
};

PlaneWizard.prototype.createUI = function(orientation, w) {
  this.ui.box = new tk.Box();
  var folder = new tk.Folder("Add a Plane");
  tk.add(this.ui.box, folder);
  var choice = ['XY', 'XZ', 'ZY'];
  this.ui.orientation = new tk.InlineRadio(choice, choice, choice.indexOf(orientation));
  this.ui.depth = new tk.Number("Depth", w);
  tk.add(folder, this.ui.orientation);
  tk.add(folder, this.ui.depth);
  var onChange = tk.methodRef(this, "synch");
  this.ui.orientation.root.find('input:radio').change(onChange);
  this.ui.depth.input.on('t-change', onChange);
  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [tk.methodRef(this, "cancelClick"), tk.methodRef(this, "okClick")]));
};

PlaneWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.viewer.render();
};

PlaneWizard.prototype.getParams = function() {
  return [this.ui.orientation.getValue(), this.ui.depth.input.val()]
};

PlaneWizard.prototype.createRequest = function(params) {
  return {
    type: 'PLANE',
    solids : [],
    params : this.operationParams,
    protoParams : this.getParams()
  }
};

PlaneWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.ui.box.close();
  this.viewer.render();
};
