import {HashTable} from '../utils/hashmap'
import Vector from '../math/vector'
import Counters from './counters'
import {findOutline, segmentsToPaths} from './workbench'
import {Matrix3, AXIS} from '../math/l3space'
import {arrFlatten1L, isCurveClass} from './cad-utils'
import DPR from '../utils/dpr'

/** @constructor */
export function Solid(csg, material, type, id) {
  csg = csg.reTesselated().canonicalized();
  this.tCadType = type || 'SOLID';
  this.csg = csg;

  this.cadGroup = new THREE.Object3D();
  this.cadGroup.__tcad_solid = this;

  this.tCadId = Counters.solid ++;
  this.id = id === undefined ? this.tCadId : id; // to keep identity through the history
  this.faceCounter = 0;

  this.wireframeGroup = new THREE.Object3D();
  this.cadGroup.add(this.wireframeGroup);
  this.mergeable = true;
  this.material = material;
  this.createGeometry();
}

Solid.prototype.createGeometry = function() {
  const geometry = new THREE.Geometry();
  geometry.dynamic = true;
  this.mesh = new THREE.Mesh(geometry, this.material);
  this.cadGroup.add(this.mesh);

  this.polyFaces = [];
  this.wires = HashTable.forEdge();
  this.curvedSurfaces = {};

  this.setupGeometry();
};

Solid.prototype.dropGeometry = function() {
  this.cadGroup.remove( this.mesh );
  this.mesh.geometry.dispose();
  for(let i = this.wireframeGroup.children.length-1; i >=0 ; i--){
    this.wireframeGroup.remove(this.wireframeGroup.children[i]);
  }
};

function groupCSG(csg) {
  var csgPolygons = csg.toPolygons();
  var groups = {};
  for (var i = 0; i < csgPolygons.length; i++) {
    var p = csgPolygons[i];
    var tag = p.shared.getTag();
    if (groups[tag] === undefined) {
      groups[tag] = {
        tag : tag,
        polygons : [],
        shared : p.shared,
        plane : p.plane
      };
    }
    groups[tag].polygons.push(p);
  }
  return groups;
}

Solid.prototype.setupGeometry = function() {
  function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}

  var off = 0;
  var groups = groupCSG(this.csg);
  var geom = this.mesh.geometry;
  for (var gIdx in groups)  {
    var group = groups[gIdx];
    if (group.shared.__tcad === undefined) group.shared.__tcad = {};
    var polyFace = new SketchFace(this, group);
    this.polyFaces.push(polyFace);
    for (var p = 0; p < group.polygons.length; ++p) {
      var poly = group.polygons[p];
      var vLength = poly.vertices.length;
      if (vLength < 3) continue;
      var firstVertex = poly.vertices[0];
      geom.vertices.push(threeV(firstVertex.pos));
      geom.vertices.push(threeV(poly.vertices[1].pos));
      var normal = threeV(poly.plane.normal);
      for (var i = 2; i < vLength; i++) {
        geom.vertices.push(threeV(poly.vertices[i].pos));

        var a = off;
        var b = i - 1 + off;
        var c = i + off;
        var face = new THREE.Face3(a, b, c);
        polyFace.faces.push(face);
        face.__TCAD_polyFace = polyFace;
        face.normal = normal;
        face.materialIndex = gIdx;
        geom.faces.push(face);
        //face.color.set(new THREE.Color().setRGB( Math.random(), Math.random(), Math.random()));
      }
      //view.setFaceColor(polyFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
      off = geom.vertices.length;
    }
    this.collectCurvedSurface(polyFace);
    this.collectWires(polyFace, group.polygons);
  }

  geom.mergeVertices();

  this.processWires();
};

Solid.prototype.vanish = function() {
  this.cadGroup.parent.remove( this.cadGroup );
  this.material.dispose();
  this.mesh.geometry.dispose();
};

Solid.prototype.collectCurvedSurface = function(face) {
  var derivedFrom = getDerivedFrom(face.csgGroup.shared);
  if (derivedFrom === null || !isCurveClass(derivedFrom._class)) return;
  var surfaces = this.curvedSurfaces[derivedFrom.id];
  if (surfaces === undefined) {
    surfaces = [];
    this.curvedSurfaces[derivedFrom.id] = surfaces;
  }
  surfaces.push(face);
  face.curvedSurfaces = surfaces;
};

Solid.prototype.collectWires = function(face, facePolygons) {

  function contains(planes, plane) {
    for (var j = 0; j < planes.length; j++) {
      if (planes[j].equals(plane)) {
        return true;
      }
    }
    return false;
  }
  
  const outline = findOutline(facePolygons);
  const paths = segmentsToPaths(outline);

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    var p, q, n = path.vertices.length;
    for (q = 0, p = n - 1; q < n; p = q++) {
      var edge = [path.vertices[p], path.vertices[q]];
      var data = this.wires.get(edge);

      if (data === null) {
        data = {
          sharedPlanes : [face.csgGroup.plane],
          sharedFaces : [face]
        };
        this.wires.put(edge, data);
      } else {
        if (!contains(data.sharedPlanes, face.csgGroup.plane)) {
          data.sharedPlanes.push(face.csgGroup.plane);
        }
        data.sharedFaces.push(face);
      }
    }
  }
};

Solid.SMOOTH_LIMIT = 10 * Math.PI / 180;

Solid.prototype.processWires = function() {
  var solid = this;
  this.wires.entries(function(edge, data) {
    if (data.sharedPlanes.length > 1) {
      var plane0 = data.sharedPlanes[0];
      var plane1 = data.sharedPlanes[1];
      var angle = Math.acos(plane0.normal.dot(plane1.normal));
      if (angle < Solid.SMOOTH_LIMIT) {
        return;
      }
    }
    for (var i = 0; i < data.sharedFaces.length; ++i) {
      for (var j = i + 1; j < data.sharedFaces.length; ++j) {
        var face0 = data.sharedFaces[0];
        var face1 = data.sharedFaces[1];
        if (sameID(getDerivedID(face0.csgGroup.shared), getDerivedID(face1.csgGroup.shared))) {
          return;
        }
      }
    }

    solid.addLineToScene(edge[0], edge[1]);
  });
};

Solid.prototype.addLineToScene = function(a, b) {
  var lg = new THREE.Geometry();
  lg.vertices.push(a);
  lg.vertices.push(b);
  var line = new THREE.Line(lg, SketchFace.prototype.WIREFRAME_MATERIAL);
  this.wireframeGroup.add(line);
};

/** @constructor */
function SketchFace(solid, csgGroup) {
  csgGroup.__face = this;
  if (csgGroup.shared.__tcad.faceId === undefined) {
    this.id = solid.tCadId + ":" + (solid.faceCounter++);
  } else {
    this.id = csgGroup.shared.__tcad.faceId;
  }
  csgGroup.shared.__tcad.faceId = this.id;

  this.solid = solid;
  this.csgGroup = csgGroup;
  this.faces = [];
  this.sketch3DGroup = null;
  this.curvedSurfaces = null;
}

SketchFace.prototype.SKETCH_MATERIAL = new THREE.LineBasicMaterial({color: 0xFFFFFF, linewidth: 3/DPR});
SketchFace.prototype.SKETCH_CONSTRUCTION_MATERIAL = new THREE.LineBasicMaterial({color: 0x777777, linewidth: 2/DPR});
SketchFace.prototype.WIREFRAME_MATERIAL = new THREE.LineBasicMaterial({color: 0x2B3856, linewidth: 3/DPR});

SketchFace.prototype.calcBasis = function() {
  var normal = new Vector().setV(this.csgGroup.plane.normal);
  var alignPlane, x, y;
  if (Math.abs(normal.dot(AXIS.Y)) < 0.5) {
    alignPlane = normal.cross(AXIS.Y);
  } else {
    alignPlane = normal.cross(AXIS.Z);
  }
  y = alignPlane.cross(normal);
  x = y.cross(normal);
  return [x, y, normal];
};

SketchFace.prototype.basis = function() {
  if (!this._basis) {
    this._basis = this.calcBasis();
  }
  return this._basis;
  //return someBasis(this.csgGroup.polygons[0].vertices.map(function (v) {
  //  return vec(v.pos)
  //}), vec(this.csgGroup.plane.normal));
};

SketchFace.prototype.depth = function() {
  return this.csgGroup.plane.w;
};

SketchFace.prototype.syncSketches = function(geom) {
  const normal = this.csgGroup.plane.normal;
  const offVector = normal.scale(0); // disable it. use polygon offset feature of material

  if (this.sketch3DGroup != null) {
    for (let i = this.sketch3DGroup.children.length - 1; i >= 0; --i) {
      this.sketch3DGroup.remove(this.sketch3DGroup.children[i]);
    }
  } else {
    this.sketch3DGroup = new THREE.Object3D();
    this.solid.cadGroup.add(this.sketch3DGroup);
  }

  const basis = this.basis();
  const _3dTransformation = new Matrix3().setBasis(basis);
  //we lost depth or z off in 2d sketch, calculate it again
  const depth = this.csgGroup.plane.w;
  const polyLines = new Map();
  function addSketchConnections(connections, material) {
    for (let i = 0; i < connections.length; ++i) {
      const l = connections[i];

      let line = polyLines.get(l.sketchObject.id);
      if (!line) {
        line = new THREE.Line(undefined, material);
        line.__TCAD_SketchObject = l.sketchObject;
        polyLines.set(l.sketchObject.id, line);
      }
      const lg = line.geometry;
      l.a.z = l.b.z = depth;
      const a = _3dTransformation.apply(l.a);
      const b = _3dTransformation.apply(l.b);

      lg.vertices.push(a.plus(offVector).three());
      lg.vertices.push(b.plus(offVector).three());
    }

  }
  addSketchConnections(geom.constructionSegments, this.SKETCH_CONSTRUCTION_MATERIAL);
  addSketchConnections(geom.connections, this.SKETCH_MATERIAL);
  addSketchConnections(arrFlatten1L(geom.loops), this.SKETCH_MATERIAL);

  for (let line of polyLines.values()) {
    this.sketch3DGroup.add(line);
  }
};


SketchFace.prototype.findById = function(sketchObjectId) {
  return this.sketch3DGroup.children.find(o => o.__TCAD_SketchObject && o.__TCAD_SketchObject.id == sketchObjectId);
};

SketchFace.prototype.getSketchObjectVerticesIn3D = function(sketchObjectId) {
  const object = this.findById(sketchObjectId);
  if (!object) {
    return undefined;
  }
  return object.geometry.vertices;;
};

function sameID(id1, id2) {
  if (id1 === null || id2 === null) {
    return false;
  }
  return id1 === id2;
}

function getDerivedID(shared) {
  return shared.__tcad && !!shared.__tcad.csgInfo && !!shared.__tcad.csgInfo.derivedFrom ? shared.__tcad.csgInfo.derivedFrom.id : null;
}

function getDerivedFrom(shared) {
  return shared.__tcad && !!shared.__tcad.csgInfo && !!shared.__tcad.csgInfo.derivedFrom ? shared.__tcad.csgInfo.derivedFrom : null;
}