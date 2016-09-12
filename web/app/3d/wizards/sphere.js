import {AXIS, IDENTITY_BASIS} from '../../math/l3space'
import * as tk from '../../ui/toolkit.js'
import {FACE_COLOR} from '../cad-utils'
import {addOkCancelLogic} from './wizard-commons'

export function SphereWizard(viewer, initParams) {
  this.previewGroup = new THREE.Object3D();
  this.viewer = viewer;
  addOkCancelLogic(this);
  viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.sphere = this.createSphere());
  if (!initParams) {
    initParams = SphereWizard.DEFAULT_PARAMS;
  }
  this.ui = {};
  this.createUI.apply(this, initParams);
  this.synch();
}

SphereWizard.DEFAULT_PARAMS = [500];

SphereWizard.prototype.createSphere = function() {
  var geometry = new THREE.SphereGeometry(1, 30, 28);
  var material = new THREE.MeshLambertMaterial( { color : FACE_COLOR, transparent: true, opacity:0.9 });
  return new THREE.Mesh(geometry, material);
};

SphereWizard.prototype.update = function(radius) {
  this.sphere.scale.x = radius;
  this.sphere.scale.y = radius;
  this.sphere.scale.z = radius;
  this.viewer.render();
};

SphereWizard.prototype.createUI = function(radius) {
  var ui = this.ui;
  ui.box = new tk.Box();
  var folder = new tk.Folder("Add a Sphere");
  tk.add(ui.box, folder);
  ui.radius = tk.config(new tk.Number("Radius", radius), {min : 0});
  tk.add(folder, ui.radius);
  var onChange = tk.methodRef(this, "synch");
  ui.radius.input.on('t-change', onChange);
  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [tk.methodRef(this, "cancelClick"), tk.methodRef(this, "okClick")]));
};

SphereWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.viewer.render();
};

SphereWizard.prototype.getParams = function() {
  return [this.ui.radius.val()];
};

SphereWizard.prototype.createRequest = function() {
  var params = this.getParams();
  return {
    type: 'SPHERE',
    solids : [],
    params : {radius : params[0]},
    protoParams : params
  }
};

SphereWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.ui.box.close();
  this.viewer.render();
};
