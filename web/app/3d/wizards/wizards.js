import Vector from '../../math/vector'
import * as cad_utils from '../cad-utils'
import * as math from '../../math/math'
import {Matrix3, AXIS, ORIGIN, IDENTITY_BASIS} from '../../math/l3space'
import DPR from '../../utils/dpr'


var IMAGINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0xFA8072,
  linewidth: 1/DPR,
  depthWrite: false,
  depthTest: false
});

var BASE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x8B0000,
  linewidth: 3/DPR,
  depthWrite: false,
  depthTest: false
});

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

function ExtrudeWizard(viewer, polygons) {
  OpWizard.call(this, viewer);
  this.polygons = polygons;
}

ExtrudeWizard.prototype = Object.create( OpWizard.prototype );

ExtrudeWizard.prototype.update = function(basis, normal, depth, scale, deflection, angle) {
  var linesCounter = 0;
  var target;
  if (deflection != 0) {
    target = normal.copy();
    if (depth < 0) target._negate();
    target = Matrix3.rotateMatrix(deflection * Math.PI / 180, basis[0], ORIGIN)._apply(target);
    if (angle != 0) {
      target = Matrix3.rotateMatrix(angle * Math.PI / 180, basis[2], ORIGIN)._apply(target);
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

function PlaneWizard(viewer) {
  this.previewGroup = new THREE.Object3D();
  this.viewer = viewer;
  viewer.scene.add(this.previewGroup);
  this.previewGroup.add(this.plane = this.createPlane());
  this.viewer.render();
  this.operationParams = {
    basis : IDENTITY_BASIS,
    depth : 0
  };
}

PlaneWizard.prototype.createPlane = function() {
  var geometry = new THREE.PlaneGeometry(750,750,1,1,1);
  var material = new THREE.MeshLambertMaterial( { color : cad_utils.FACE_COLOR, transparent: true, opacity:0.5, side: THREE.DoubleSide });
  var plane = new THREE.Mesh(geometry, material);
  return plane;
};

PlaneWizard.prototype.update = function(orientation, w) {
  if (orientation === 'XY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = 0;
    this.plane.position.z = w;
    this.operationParams.basis = IDENTITY_BASIS;
  } else if (orientation === 'XZ') {
    this.plane.rotation.x = Math.PI / 2;
    this.plane.rotation.y = 0;
    this.plane.rotation.z = 0;
    this.plane.position.x = 0;
    this.plane.position.y = w;
    this.plane.position.z = 0;
    this.operationParams.basis = [AXIS.X, AXIS.Z, AXIS.Y];
  } else if (orientation === 'ZY') {
    this.plane.rotation.x = 0;
    this.plane.rotation.y = Math.PI / 2;
    this.plane.rotation.z = 0;
    this.plane.position.x = w;
    this.plane.position.y = 0;
    this.plane.position.z = 0;
    this.operationParams.basis = [AXIS.Z, AXIS.Y, AXIS.X];
  } else {
    throw orientation + " isn't supported yet";
  }
  this.operationParams.depth = w;
  this.viewer.render();
};

PlaneWizard.prototype.dispose = function() {
  this.viewer.scene.remove(this.previewGroup);
  this.viewer.render();
};

export {ExtrudeWizard, PlaneWizard}