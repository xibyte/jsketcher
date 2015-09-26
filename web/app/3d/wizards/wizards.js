TCAD.wizards = {};

TCAD.wizards.IMAGINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0xFA8072,
  linewidth: 1/TCAD.DPR,
  depthWrite: false,
  depthTest: false
});

TCAD.wizards.BASE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x8B0000,
  linewidth: 3/TCAD.DPR,
  depthWrite: false,
  depthTest: false
});

TCAD.wizards.OpWizard = function(viewer) {
  this.previewGroup = new THREE.Object3D();
  this.lines = [];
  this.viewer = viewer;
  viewer.scene.add(this.previewGroup);
};

TCAD.wizards.OpWizard.prototype.setupLine = function(lineId, a, b, material) {
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

TCAD.wizards.OpWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.viewer.render();
};

TCAD.wizards.ExtrudeWizard = function(viewer, polygons) {
  TCAD.wizards.OpWizard.call(this, viewer);
  this.polygons = polygons;
};

TCAD.wizards.ExtrudeWizard.prototype = Object.create( TCAD.wizards.OpWizard.prototype );

TCAD.wizards.ExtrudeWizard.prototype.update = function(target) {
  var linesCounter = 0;
  for (var i = 0; i < this.polygons.length; i++) {
    var poly = this.polygons[i];
    var lid = TCAD.geom.calculateExtrudedLid(poly, target, 1);
    var p, q, n = poly.length;
    for (p = n - 1, q = 0; q < n; p = q++) {
      this.setupLine(linesCounter ++, poly[p], poly[q], TCAD.wizards.BASE_MATERIAL);
      this.setupLine(linesCounter ++, lid[p], lid[q], TCAD.wizards.IMAGINE_MATERIAL);
    }
    for (q = 0; q < n; q++) {
      this.setupLine(linesCounter ++, poly[q], lid[q], TCAD.wizards.IMAGINE_MATERIAL);
    }
  }
};
