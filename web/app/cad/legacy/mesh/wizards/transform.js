import {AXIS} from '../../../../../../modules/math/l3space'
import * as tk from '../../../../ui/toolkit.js'
import {FACE_COLOR} from '../../../cad-utils'
import {Wizard} from './wizard-commons'
import {IDENTITY_BASIS} from "../../../../../../modules/math/basis";

export function TransformWizard(viewer, solid, initParams) {
  Wizard.call(this, viewer, initParams);
  this.previewGroup = new THREE.Object3D();
  this.solid = solid;
  this.initialPosition = this.solid.cadGroup.position.clone();
  this.viewer.transformControls.attach(this.solid.cadGroup);
  this.transfomControlListener = tk.methodRef(this, "synchToUI");
  this.viewer.transformControls.addEventListener( 'objectChange', this.transfomControlListener );
  this.synch();
}

TransformWizard.prototype = Object.create( Wizard.prototype );

TransformWizard.prototype.DEFAULT_PARAMS = [0, 0, 0, 0, 0, 0, 1];

TransformWizard.prototype.title = function() {
  return "Solid Transform";
};

TransformWizard.prototype.discardChanges = function() {
  this.solid.cadGroup.position.copy(this.initialPosition);
};

TransformWizard.prototype.update = function(x, y, z, rotationX, rotationY, rotationZ, rotationW) {
  this.solid.cadGroup.position.setX(x);
  this.solid.cadGroup.position.setX(y);
  this.solid.cadGroup.position.setX(z);
  
  this.solid.cadGroup.quaternion.x = rotationX;
  this.solid.cadGroup.quaternion.y = rotationY;
  this.solid.cadGroup.quaternion.z = rotationZ;
  this.solid.cadGroup.quaternion.w = rotationW;

  this.viewer.transformControls.update();
  this.viewer.render();
};

TransformWizard.prototype.createUI = function(x, y, z, rotationX, rotationY, rotationZ, rotationW) {
  const ui = this.ui;
  const folder = ui.folder;
  var position = new tk.Folder("Position");
  var rotation = new tk.Folder("Rotation");
  tk.add(folder, position);
  tk.add(folder, rotation);
  tk.add(ui.box, folder);
  ui.x = new tk.Number("Position X", x, 1, 6);
  ui.y = new tk.Number("Position Y", y, 1, 6);
  ui.z = new tk.Number("Position Z", z, 1, 6);
  ui.rotationX = tk.config(new tk.Number("Rotation X", rotationX, 0.1, 6), {min: -1, max: 1});
  ui.rotationY = tk.config(new tk.Number("Rotation Y", rotationY, 0.1, 6), {min: -1, max: 1});
  ui.rotationZ = tk.config(new tk.Number("Rotation Z", rotationZ, 0.1, 6), {min: -1, max: 1});
  ui.rotationW = tk.config(new tk.Number("Rotation W", rotationW, 0.1, 6), {min: -1, max: 1});
  ui.mode = new tk.InlineRadio(['translate(T)', 'rotate(R)'], ['translate', 'rotate'], 0);
  tk.add(position, ui.x);
  tk.add(position, ui.y);
  tk.add(position, ui.z);
  tk.add(rotation, ui.rotationX);
  tk.add(rotation, ui.rotationY);
  tk.add(rotation, ui.rotationZ);
  tk.add(rotation, ui.rotationW);
  tk.add(rotation, ui.mode);
  this.ui.mode.root.find('input:radio').change(tk.methodRef(this, "modeChanged"));
  var onChange = tk.methodRef(this, "synch");
  ui.x.input.on('t-change', onChange);
  ui.y.input.on('t-change', onChange);
  ui.z.input.on('t-change', onChange);
  ui.rotationX.input.on('t-change', onChange);
  ui.rotationY.input.on('t-change', onChange);
  ui.rotationZ.input.on('t-change', onChange);
};

TransformWizard.prototype.modeChanged = function() {
  var mode = this.ui.mode.getValue();
  this.viewer.transformControls.setMode(mode);
};

TransformWizard.prototype.synchToUI = function() {
  function round(val){return val.toFixed(6);}
  var ui = this.ui;
  ui.x.input.val( round(this.solid.cadGroup.position.x) );
  ui.y.input.val( round(this.solid.cadGroup.position.y) );
  ui.z.input.val( round(this.solid.cadGroup.position.z) );
  ui.rotationX.input.val( round(this.solid.cadGroup.quaternion.x) );
  ui.rotationY.input.val( round(this.solid.cadGroup.quaternion.y) );
  ui.rotationZ.input.val( round(this.solid.cadGroup.quaternion.z) );
  ui.rotationW.input.val( round(this.solid.cadGroup.quaternion.w) );
  this.viewer.render();
};

TransformWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.viewer.render();
};

TransformWizard.prototype.getParams = function() {
  return [this.ui.x.val(), this.ui.y.val(), this.ui.z.val(), 
    this.ui.rotationX.val(), this.ui.rotationY.val(), this.ui.rotationZ.val(), this.ui.rotationW.val()];
};

TransformWizard.prototype.createRequest = function(done) {
  var params = this.getParams();
  done({
    type: 'TRANSFORM',
    solids : [],
    params : {
      position: {x : params[0], y : params[1], z : params[2]},
      rotate: {x : params[3], y : params[4], z : params[5]}
    } ,
    protoParams : params
  });
};

TransformWizard.prototype.cancelClick = function() {
  Wizard.prototype.cancelClick.call(this);
  this.discardChanges();
};

TransformWizard.prototype.dispose = function() {
  Wizard.prototype.dispose.call(this);
  this.viewer.transformControls.removeEventListener( 'objectChange', this.transfomControlListener );
  this.viewer.transformControls.detach(this.solid.cadGroup);
  this.viewer.render();
};
