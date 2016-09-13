import {AXIS, IDENTITY_BASIS} from '../../math/l3space'
import * as tk from '../../ui/toolkit.js'
import {FACE_COLOR} from '../cad-utils'
import {addOkCancelLogic} from './wizard-commons'

export function BoxWizard(viewer, initParams) {
  this.previewGroup = new THREE.Object3D();
  this.viewer = viewer;
  addOkCancelLogic(this);
  viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.box = this.createBox());
  if (!initParams) {
    initParams = BoxWizard.DEFAULT_PARAMS;
  }
  this.ui = {};
  this.createUI.apply(this, initParams);
  this.synch();
}

BoxWizard.DEFAULT_PARAMS = [500, 500, 500];

BoxWizard.prototype.createBox = function() {
  var geometry = new THREE.BoxGeometry(1, 1, 1);
  var material = new THREE.MeshLambertMaterial( { color : FACE_COLOR, transparent: true, opacity:0.5, side: THREE.DoubleSide });
  return new THREE.Mesh(geometry, material);
};

BoxWizard.prototype.update = function(w, h, d) {
  this.box.scale.x = w;
  this.box.scale.y = h;
  this.box.scale.z = d;
  this.viewer.render();
};

BoxWizard.prototype.createUI = function(w, h, d) {
  var ui = this.ui;
  ui.box = new tk.Box();
  var folder = new tk.Folder("Add a Box");
  tk.add(ui.box, folder);
  ui.width = tk.config(new tk.Number("Width", w), {min : 0});
  ui.height = tk.config(new tk.Number("Height", h), {min : 0});
  ui.depth = tk.config(new tk.Number("Depth", d), {min : 0});
  tk.add(folder, ui.width);
  tk.add(folder, ui.height);
  tk.add(folder, ui.depth);
  var onChange = tk.methodRef(this, "synch");
  ui.width.input.on('t-change', onChange);
  ui.height.input.on('t-change', onChange);
  ui.depth.input.on('t-change', onChange);
  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [tk.methodRef(this, "cancelClick"), tk.methodRef(this, "okClick")]));
};

BoxWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.viewer.render();
};

BoxWizard.prototype.getParams = function() {
  return [Number(this.ui.width.input.val()), Number(this.ui.height.input.val()), Number(this.ui.depth.input.val())];
};

BoxWizard.prototype.createRequest = function() {
  var params = this.getParams();
  return {
    type: 'BOX',
    solids : [],
    params : {w : params[0], h : params[1], d : params[2]},
    protoParams : params
  }
};

BoxWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.ui.box.close();
  this.viewer.render();
};
