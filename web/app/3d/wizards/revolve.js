import * as tk from '../../ui/toolkit.js'
import * as workbench from '../workbench'
import * as cad_utils from '../cad-utils'
import Vector from '../../math/vector'
import {Matrix3, ORIGIN} from '../../math/l3space'
import {revolveToWireframe} from '../revolve'
import {OpWizard, IMAGINE_MATERIAL, BASE_MATERIAL} from './wizard-commons'

export function RevolveWizard(app, face, initParams) {
  OpWizard.call(this, app.viewer, initParams);
  this.app = app;
  this.face = face;
  this.updatePolygons();
  this.synch();
  this.autoResoltion = true;
}

function defaultResolution(angle) {
  return Math.max(2, Math.round(angle / 4.0 ));
}

RevolveWizard.prototype = Object.create( OpWizard.prototype );

RevolveWizard.prototype.DEFAULT_PARAMS = [180, defaultResolution(180)];

RevolveWizard.prototype.title = function() {
  return "Revolve";
};

RevolveWizard.prototype.updatePolygons = function() {
  this.polygons = workbench.getSketchedPolygons3D(this.app, this.face);
};

RevolveWizard.prototype.update = function(angle, resolution) {
  let linesCounter = 0;
  const segments = revolveToWireframe(this.polygons, this.polygons[0], angle / 180 * Math.PI, resolution);
  for (let segment of segments) {
    this.setupLine(linesCounter ++, segment[0], segment[1], IMAGINE_MATERIAL);
  }
  for (var i = 0; i < this.lines.length; i++) {
    this.lines[i].visible = i < linesCounter;
  }
};

RevolveWizard.prototype.createUI = function (angle, resolution) {
  const ui = this.ui;
  const folder = this.ui.folder;
  tk.add(ui.box, folder);
  ui.angle = tk.config(new tk.Number("Angle", angle, 5), {min: -360, max: 360, accelerator: 10});
  ui.resolution = tk.config(new tk.Number("Resolution", resolution), {min: 2, accelerator: 2});
  
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
};

RevolveWizard.prototype.synch = function() {
  this.update.apply(this, this.getParams());
  this.app.viewer.render();
};

RevolveWizard.prototype.getParams = function() {
  var angleValue = parseFloat(this.ui.angle.input.val());
  var resolutionValue = parseFloat(this.ui.resolution.input.val());
  return [angleValue, resolutionValue];
};

RevolveWizard.prototype.createRequest = function(done) {
  const params = this.getParams();
  done({
    type : 'REVOLVE',
    solids : [this.app.findSolidByCadId(this.face.solid.tCadId)],
    face : this.app.findFace(this.face.id),
    params : {
      angle: params[0],
      resolution: params[1]
    },
    protoParams: params
  });
};
