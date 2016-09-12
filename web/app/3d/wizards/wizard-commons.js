import DPR from '../../utils/dpr'

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

function addOkCancelLogic(wizard) {
  wizard.apply = function() {};
  wizard.onCancel = function() {};
  wizard.okClick = function() {
    this.apply();
    this.dispose();
  };
  wizard.cancelClick = function() {
    this.onCancel();
    this.dispose();
  };
}

function OpWizard(viewer) {
  this.previewGroup = new THREE.Object3D();
  this.lines = [];
  this.viewer = viewer;
  viewer.scene.add(this.previewGroup);
}

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

OpWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.viewer.render();
};

export {OpWizard, IMAGINE_MATERIAL, BASE_MATERIAL, addOkCancelLogic}