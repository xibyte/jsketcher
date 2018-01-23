import DPR from 'dpr'
import * as tk from '../../../../ui/toolkit'

const IMAGINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0xFA8072,
  linewidth: 1/DPR,
  depthWrite: false,
  depthTest: false
});

const BASE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x8B0000,
  linewidth: 3/DPR,
  depthWrite: false,
  depthTest: false
});

const IMAGINARY_SURFACE_MATERIAL = new THREE.MeshPhongMaterial({
  vertexColors: THREE.FaceColors,
  color: 0xFA8072,
  transparent: true,
  opacity: 0.5,
  shininess: 0,
  side : THREE.DoubleSide
});

export function Wizard(viewer, initParams) {
  if (!initParams) initParams = this.DEFAULT_PARAMS;
  this.viewer = viewer;
  this.disposed = false;
  this.ui = {
    box: new tk.Box($('#view-3d')), 
    folder: new tk.Folder(this.title())
  };
  tk.add(this.ui.box, this.ui.folder);

  this.ui.box.root.keydown((e) => {
    switch (e.keyCode) {
      case 27 : this.cancelClick(); break;
      case 13 : this.okClick(); break;
    }
  });

  this.createUI.apply(this, initParams);
  this.addButtons(this.ui.folder);
}

Wizard.prototype.apply = function(done) {
  this.createRequest((request) => {
    try {
      if (!this.disposed) {
        this.onRequestReady(request);
      }
    } finally {
      done();
    }
  });
};

Wizard.prototype.onRequestReady = function() {}; // For clients

Wizard.prototype.okClick = function() {
  this.ui.buttons.root.find('.tc-block-btn').eq(1)
    .removeClass('active-btn')
    .html('<i class="fa fa-cog fa-spin"></i>');
  this.apply(() => this.dispose());
};

Wizard.prototype.cancelClick = function() {
  this.dispose();
};

Wizard.prototype.dispose = function() {
  this.disposed = true;
  this.ui.box.close();
};

Wizard.prototype.focus = function() {
  this.ui.box.root.find('input, select').first().focus()
};

Wizard.prototype.addButtons = function(folder) {
  this.ui.buttons = new tk.ButtonRow(["Cancel", "OK"], [() => this.cancelClick(), () => this.okClick()]);
  tk.add(folder, this.ui.buttons);
};

Wizard.InvalidRequest = function(message) {
  this.invalidAndShouldBeDropped = true;
  this.message = message;
};

function OpWizard(viewer, initParams) {
  Wizard.call(this, viewer, initParams);
  this.previewGroup = new THREE.Object3D();
  this.lines = [];
  viewer.scene.add(this.previewGroup);
}

OpWizard.prototype = Object.create( Wizard.prototype );

OpWizard.prototype.setupLine = function(lineId, a, b, material) {
  var line = this.lines[lineId];
  if (line === undefined) {
    var lg = new THREE.Geometry();
    lg.vertices.push(new THREE.Vector3().copy(a));
    lg.vertices.push(new THREE.Vector3().copy(b));
    line = new THREE.Line(lg, material);
    line.renderOrder = 1e10;
    this.previewGroup.add(line);
    this.lines[lineId] = line;
  } else {
    line.geometry.vertices[0] = new THREE.Vector3().copy(a);
    line.geometry.vertices[1] = new THREE.Vector3().copy(b);
    line.geometry.verticesNeedUpdate = true;
  }
};

OpWizard.prototype.disposeLines = function() {
  for (let line of this.lines) {
    line.geometry.dispose();
  }
};

OpWizard.prototype.dispose = function() {
  Wizard.prototype.dispose.call(this);
  this.viewer.scene.remove(this.previewGroup);
  this.disposeLines();
  this.viewer.render();
};

export {OpWizard, IMAGINE_MATERIAL, IMAGINARY_SURFACE_MATERIAL, BASE_MATERIAL}