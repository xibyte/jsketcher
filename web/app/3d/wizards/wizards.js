TCAD.wizards = {};

TCAD.wizards.OpWizard = function(viewer) {
  this.previewGroup = new THREE.Object3D();
  this.previewGroup.renderDepth = 1e20;
  viewer.scene.add(this.previewGroup);
  this.lines = [];
};

TCAD.wizards.OpWizard.prototype.setupLine = function(lineId, a, b) {
  var line = this.lines[lineId];
  if (line === undefined) {
    var lg = new THREE.Geometry();
    lg.vertices.push(new THREE.Vector3().copy(a));
    lg.vertices.push(new THREE.Vector3().copy(b));
    TCAD.SketchFace.prototype.WIREFRAME_MATERIAL.depthWrite = false;
    line = new THREE.Segment(lg, TCAD.SketchFace.prototype.WIREFRAME_MATERIAL);
    line.renderDepth = 0;
    this.previewGroup.add(line);
    this.lines[lineId] = line;
  } else {
    line.geometry.vertices[0] = new THREE.Vector3().copy(a);
    line.geometry.vertices[1] = new THREE.Vector3().copy(b);
    line.geometry.verticesNeedUpdate = true;
  }
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
      this.setupLine(linesCounter ++, poly[p], poly[q]);
      this.setupLine(linesCounter ++, lid[p], lid[q]);
    }
    for (q = 0; q < n; q++) {
      this.setupLine(linesCounter ++, poly[q], lid[q]);
    }
  }
};
