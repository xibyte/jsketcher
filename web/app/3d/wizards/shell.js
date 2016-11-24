import {ExtrudeWizard} from './extrude'
import * as workbench from '../workbench'
import * as tk from '../../ui/toolkit.js'


export function ShellWizard(app, face, initParams) {
  ExtrudeWizard.call(this, app, face, true, initParams);
}

ShellWizard.prototype = Object.create( ExtrudeWizard.prototype );

ShellWizard.prototype.DEFAULT_PARAMS = [50, 1, 0, 0];

ShellWizard.prototype.title = function() {
  return "Create a Shell";
};

ShellWizard.prototype.update = function(d) {
  ExtrudeWizard.prototype.update.call(this, d, 1, 0, 0);
};

ExtrudeWizard.prototype.updatePolygons = function() {
  this.polygons = [];//workbench.reconstructOutline(this.face.solid.csg, this.face);
};

ShellWizard.prototype.createUI = function(d) {
  this.ui.depth = tk.config(new tk.Number("Depth", d), {min : 0});
  tk.add(this.ui.folder, this.ui.depth);
  var onChange = tk.methodRef(this, "synch");
  this.ui.depth.input.on('t-change', onChange);
};

ShellWizard.prototype.getParams = function() {
  return [Number(this.ui.depth.input.val())];
};

ShellWizard.prototype.createRequest = function(done) {
  var params = this.getParams();
  done({
    type: 'SHELL',
    solids : [],
    params : {d : params[0]},
    protoParams : params
  });
};
