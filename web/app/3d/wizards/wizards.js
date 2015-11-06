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

TCAD.wizards.ExtrudeWizard.prototype.update = function(basis, normal, depth, scale, deflection, angle) {
  var linesCounter = 0;
  var target;
  if (deflection != 0) {
    target = normal.copy();
    if (depth < 0) target._negate();
    target = TCAD.math.rotateMatrix(deflection * Math.PI / 180, basis[0], TCAD.math.ORIGIN)._apply(target);
    if (angle != 0) {
      target = TCAD.math.rotateMatrix(angle * Math.PI / 180, basis[2], TCAD.math.ORIGIN)._apply(target);
    }
    target._multiply(Math.abs(depth));
  } else {
    target = normal.multiply(depth)
  }
  for (var i = 0; i < this.polygons.length; i++) {
    var poly = this.polygons[i];
    var lid = TCAD.geom.calculateExtrudedLid(poly, normal, target, scale);
    var p, q, n = poly.length;
    for (p = n - 1, q = 0; q < n; p = q++) {
      this.setupLine(linesCounter ++, poly[p], poly[q], TCAD.wizards.BASE_MATERIAL);
      this.setupLine(linesCounter ++, lid[p], lid[q], TCAD.wizards.IMAGINE_MATERIAL);
    }
    for (q = 0; q < n; q++) {
      this.setupLine(linesCounter ++, poly[q], lid[q], TCAD.wizards.IMAGINE_MATERIAL);
    }
  }
  this.operationParams = {
    target : target,
    expansionFactor : scale
  }
};


TCAD.wizards.PlaneWizard = function(viewer) {
  this.previewGroup = new THREE.Object3D();
  this.viewer = viewer;
  viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.plane = this.createPlane());
  this.viewer.render();
  this.operationParams = {
    basis : TCAD.math.IDENTITY_BASIS,
    depth : 0
  };
};

TCAD.wizards.PlaneWizard.prototype.createPlane = function() {
  var geometry = new THREE.PlaneGeometry(750,750,1,1,1);
  var material = new THREE.MeshLambertMaterial( { color : TCAD.view.FACE_COLOR, transparent: true, opacity:0.5, side: THREE.DoubleSide });
  var plane = new THREE.Mesh(geometry, material);
  return plane;
};

TCAD.wizards.PlaneWizard.prototype.update = function(orientation, w) {
  if (orientation === 'XY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = 0;
    this.plane.position.z = w;
    this.operationParams.basis = TCAD.math.IDENTITY_BASIS;
  } else if (orientation === 'XZ') {
    this.plane.rotation.x = Math.PI / 2;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = w;
    this.plane.position.z = 0;
    this.operationParams.basis = [TCAD.math.AXIS.X, TCAD.math.AXIS.Z, TCAD.math.AXIS.Y];
  } else if (orientation === 'ZY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = Math.PI / 2;
    this.plane.rotation.z = 0;
    this.plane.position.x = w;
    this.plane.position.y = 0;
    this.plane.position.z = 0;
    this.operationParams.basis = [TCAD.math.AXIS.Z, TCAD.math.AXIS.Y, TCAD.math.AXIS.X];
  } else {
    throw orientation + " isn't supported yet";
  }
  this.operationParams.depth = w;
  this.viewer.render();
};

TCAD.wizards.PlaneWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.viewer.render();
};