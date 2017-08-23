import {HashTable} from '../../utils/hashmap'
import Vector from '../../math/vector'
import Counters from '../counters'
import {findOutline, segmentsToPaths, reconstructSketchBounds} from '../craft/mesh/workbench'
import {Matrix3, AXIS} from '../../math/l3space'
import {arrFlatten1L, isCurveClass} from '../cad-utils'
import DPR from '../../utils/dpr'
import {SceneSolid, SceneFace} from './scene-object'

export class MeshSceneSolid extends SceneSolid {
  
  constructor(csg, type, id) {
    super(type, id);
    csg = csg.reTesselated().canonicalized();
    this.csg = csg;
    this.createGeometry();
  }

  createGeometry() {
    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.cadGroup.add(this.mesh);
  
    this.wires = HashTable.forEdge();
    this.curvedSurfaces = {};
  
    this.setupGeometry();
  }

  dropGeometry() {
    this.cadGroup.remove( this.mesh );
    this.mesh.geometry.dispose();
    for(let i = this.wireframeGroup.children.length-1; i >=0 ; i--){
      this.wireframeGroup.remove(this.wireframeGroup.children[i]);
    }
  }

  setupGeometry() {
    function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}

    var off = 0;
    var groups = groupCSG(this.csg);
    var geom = this.mesh.geometry;
    for (var gIdx in groups)  {
      var group = groups[gIdx];
      if (group.shared.__tcad === undefined) group.shared.__tcad = {};
      var sceneFace = new MeshSceneFace(this, group);
      this.sceneFaces.push(sceneFace);
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
          const face = sceneFace.createMeshFace(a, b, c);
          face.normal = normal;
          face.materialIndex = gIdx;
          geom.faces.push(face);
          //face.color.set(new THREE.Color().setRGB( Math.random(), Math.random(), Math.random()));
        }
        //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
        off = geom.vertices.length;
      }
      this.collectCurvedSurface(sceneFace);
      this.collectWires(sceneFace, group.polygons);
    }

    geom.mergeVertices();

    this.processWires();
  };
  
  collectCurvedSurface(face) {
    var derivedFrom = getDerivedFrom(face.csgGroup.shared);
    if (derivedFrom === null || !isCurveClass(derivedFrom._class)) return;
    var surfaces = this.curvedSurfaces[derivedFrom.id];
    if (surfaces === undefined) {
      surfaces = [];
      this.curvedSurfaces[derivedFrom.id] = surfaces;
    }
    surfaces.push(face);
    face.curvedSurfaces = surfaces;
  }

  collectWires(face, facePolygons) {

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
  }

  processWires() {
    var solid = this;
    this.wires.entries(function(edge, data) {
      if (data.sharedPlanes.length > 1) {
        var plane0 = data.sharedPlanes[0];
        var plane1 = data.sharedPlanes[1];
        var angle = Math.acos(plane0.normal.dot(plane1.normal));
        if (angle < SMOOTH_LIMIT) {
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
  }
}

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

const SMOOTH_LIMIT = 10 * Math.PI / 180;

class MeshSceneFace extends SceneFace {
  constructor(solid, csgGroup) {
    super(solid, csgGroup.shared.__tcad.faceId);
    csgGroup.__face = this;
    csgGroup.shared.__tcad.faceId = this.id;

    this.csgGroup = csgGroup;
    this.curvedSurfaces = null;
  }
  
  normal() {
    return this.csgGroup.plane.normal;
  }
  
  depth() {
    return this.csgGroup.plane.w;
  }

  surface() {
    return this.csgGroup.plane;
  }    

  getBounds() {
    return reconstructSketchBounds(this.solid.csg, this);
  }
}

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