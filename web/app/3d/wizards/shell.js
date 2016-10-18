import {ExtrudeWizard} from './extrude'
import * as workbench from '../workbench'
import * as tk from '../../ui/toolkit.js'


export function ShellWizard(app, face, initParams) {
  ExtrudeWizard.call(this, app, face, true, [ShellWizard.DEFAULT_PARAMS, 1, 0, 0]);
}

ShellWizard.prototype = Object.create( ExtrudeWizard.prototype );

ShellWizard.DEFAULT_PARAMS = [50];

ShellWizard.prototype.update = function(d) {
  ExtrudeWizard.prototype.update.call(this, d, 1, 0, 0);
};

ExtrudeWizard.prototype.updatePolygons = function() {
  this.polygons = [];//workbench.reconstructOutline(this.face.solid.csg, this.face);
};

ShellWizard.prototype.createUI = function(d) {
  var ui = this.ui;
  ui.box = new tk.Box();
  var folder = new tk.Folder("Shell Options");
  tk.add(ui.box, folder);
  ui.depth = tk.config(new tk.Number("Depth", d), {min : 0});
  tk.add(folder, ui.depth);
  var onChange = tk.methodRef(this, "synch");
  ui.depth.input.on('t-change', onChange);
  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [tk.methodRef(this, "cancelClick"), tk.methodRef(this, "okClick")]));
};

ShellWizard.prototype.getParams = function() {
  return [Number(this.ui.depth.input.val())];
};

ShellWizard.prototype.createRequest = function() {
  var params = this.getParams();
  return {
    type: 'SHELL',
    solids : [],
    params : {d : params[0]},
    protoParams : params
  }
};
