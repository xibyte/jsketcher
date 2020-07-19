import * as tk from '../../../../ui/toolkit.js'
import {FACE_COLOR} from '../../../cad-utils'
import {Wizard} from './wizard-commons'

export function SphereWizard(viewer, initParams) {
  Wizard.call(this, viewer, initParams);
  this.previewGroup = new THREE.Object3D();
  this.viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.sphere = this.createSphere());
  this.synch();
}

SphereWizard.prototype = Object.create( Wizard.prototype );

SphereWizard.prototype.DEFAULT_PARAMS = [500];

SphereWizard.prototype.title = function() {
  return "Add a Sphere";
};

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
  this.ui.radius = tk.config(new tk.Number("Radius", radius), {min : 0});
  tk.add(this.ui.folder, this.ui.radius);
  var onChange = tk.methodRef(this, "synch");
  this.ui.radius.input.on('t-change', onChange);
};

SphereWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.viewer.render();
};

SphereWizard.prototype.getParams = function() {
  return [this.ui.radius.val()];
};

SphereWizard.prototype.createRequest = function(done) {
  var params = this.getParams();
  done({
    type: 'SPHERE',
    solids : [],
    params : {radius : params[0]},
    protoParams : params
  });
};

SphereWizard.prototype.dispose = function() {
  Wizard.prototype.dispose.call(this);
  this.viewer.scene.remove(this.previewGroup);
  this.viewer.render();
};
