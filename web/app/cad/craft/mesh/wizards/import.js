import * as tk from '../../../../ui/toolkit.js'
import {Wizard} from './wizard-commons'
import {LoadSTLFromURL} from '../../../stl/io'

export function ImportWizard(viewer, initParams) {
  Wizard.call(this, viewer, initParams);
}

ImportWizard.prototype = Object.create( Wizard.prototype );

ImportWizard.prototype.DEFAULT_PARAMS = ['https://cdn.thingiverse.com/assets/de/88/44/ab/fe/Touring_Bike_not_for_print.stl'];

ImportWizard.prototype.title = function() {
  return "Import URL";
};

ImportWizard.prototype.createUI = function (url) {
  this.ui.url = new tk.Text("URL", url);
  tk.add(this.ui.folder, this.ui.url);
};

ImportWizard.prototype.getParams = function() {
  return [this.ui.url.input.val()];
};

ImportWizard.prototype.createRequest = function(done) {
  const protoParams = this.getParams();
  const url = protoParams[0];
  LoadSTLFromURL(url, (objects, err) => {
    if (objects == null || objects.length == 0) {
      done(new Wizard.InvalidRequest("Server returned no data or format isn't supported." + (err ? " Http Status: " + err : "") ))
    } else {
      done({
        type : 'IMPORT_STL',
        solids: [],
        params: {objects, url},
        protoParams
      });
    }
  });
};
