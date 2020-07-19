import * as tk from '../../../../ui/toolkit.js'
import * as workbench from '../workbench'
import * as cad_utils from '../../../cad-utils'
import Vector, {ORIGIN} from 'math/vector';
import {OpWizard, IMAGINE_MATERIAL, BASE_MATERIAL} from './wizard-commons'
import {Matrix3x4} from 'math/matrix';

export function ExtrudeWizard(app, face, invert, initParams) {
  this.invert = invert; // title depends on invert flag
  OpWizard.call(this, app.viewer, initParams);
  this.app = app;
  this.face = face;
  this.updatePolygons();
  this.synch();
}

ExtrudeWizard.prototype = Object.create( OpWizard.prototype );

ExtrudeWizard.prototype.DEFAULT_PARAMS = [50, 1, 0, 0];

ExtrudeWizard.prototype.title = function() {
  return this.invert ? "Cut Options" : "Extrude Options";
};

ExtrudeWizard.prototype.updatePolygons = function() {
  this.polygons = workbench.getSketchedPolygons3D(this.app, this.face);
};

ExtrudeWizard.prototype.update = function(depth, scale, deflection, angle) {
  if (this.invert) depth *= -1; //depth;

  var basis = this.face.basis(); 
  var normal = new Vector().setV(this.face.csgGroup.plane.normal);
  var linesCounter = 0;
  var target;
  if (deflection != 0) {
    target = normal.copy();
    if (depth < 0) target._negate();
    target = Matrix3x4.rotateMatrix(deflection * Math.PI / 180, basis[0], ORIGIN)._apply(target);
    if (angle != 0) {
      target = Matrix3x4.rotateMatrix(angle * Math.PI / 180, basis[2], ORIGIN)._apply(target);
    }
    target._multiply(Math.abs(depth));
  } else {
    target = normal.multiply(depth)
  }
  for (var i = 0; i < this.polygons.length; i++) {
    var poly = this.polygons[i];
    var lid = cad_utils.calculateExtrudedLid(poly, normal, target, scale);
    var p, q, n = poly.length;
    for (p = n - 1, q = 0; q < n; p = q++) {
      this.setupLine(linesCounter ++, poly[p], poly[q], BASE_MATERIAL);
      this.setupLine(linesCounter ++, lid[p], lid[q], IMAGINE_MATERIAL);
    }
    for (q = 0; q < n; q++) {
      this.setupLine(linesCounter ++, poly[q], lid[q], IMAGINE_MATERIAL);
    }
  }
  this.operationParams = {
    target : target,
    expansionFactor : scale
  }
};

ExtrudeWizard.prototype.createUI = function (depth, scale, deflection, angle) {
  const ui = this.ui;
  const folder = this.ui.folder;
  tk.add(ui.box, folder);
  ui.theValue = tk.config(new tk.Number(this.invert ? "Depth" : "Height", depth), {min: 0});
  ui.scale = tk.config(new tk.Number("Prism", scale, 0.1, 1), {min:0});
  ui.deflection = new tk.Number("Angle", deflection, 1);
  ui.angle = new tk.Number("Rotation", angle, 5);
  var onChange = tk.methodRef(this, "synch");
  ui.theValue.input.on('t-change', onChange);
  ui.scale.input.on('t-change', onChange);
  ui.deflection.input.on('t-change', onChange);
  ui.angle.input.on('t-change', onChange);
  tk.add(folder, ui.theValue);
  tk.add(folder, ui.scale);
  tk.add(folder, ui.deflection);
  tk.add(folder, ui.angle);
};

ExtrudeWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.app.viewer.render();
};

ExtrudeWizard.prototype.getParams = function() {
  var depthValue = this.ui.theValue.input.val();
  var scaleValue = this.ui.scale.input.val();
  var deflectionValue = this.ui.deflection.input.val();
  var angleValue = this.ui.angle.input.val();
  return [depthValue, scaleValue, deflectionValue, angleValue];
};

ExtrudeWizard.prototype.createRequest = function(done) {
  done({
    type : this.invert ? 'CUT' : 'EXTRUDE',
    solids : [this.app.findSolidByCadId(this.face.solid.tCadId)],
    face : this.app.findFace(this.face.id),
    params : this.operationParams,
    protoParams : this.getParams()
  });
};
