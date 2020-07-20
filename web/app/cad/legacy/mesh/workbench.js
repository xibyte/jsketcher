import Vector from 'math/vector';
import * as cad_utils from '../../cad-utils'
import {HashTable} from '../../../utils/hashmap'
import {Mesh} from '../mesh'
import revolve from './revolve'
import {Triangulate} from '../../tess/triangulation'
import {distanceAB3} from "math/distance";
import {areEqual, equal, strictEqual} from "math/equality";
import {isPointInsidePolygon} from "geom/euclidean";

export function sortPolygons(polygons) {
  function Loop(polygon) {
    this.polygon = polygon;
    this.nesting = [];
    this.level = 0;
  }
  function contains(polygon, other) {
    for (let point of other._2D) {
      if (!isPointInsidePolygon(point, polygon._2D)) {
        return false;
      }
    }
    return true;
  }
  const loops = polygons.map(p => new Loop(p));
  for (let i = 0; i < loops.length; ++i) {
    const loop = loops[i];
    for (let j = 0; j < loops.length; ++j) {
      if (i == j) continue;
      const other = loops[j];
      if (contains(loop.polygon, other.polygon)) {
        loop.nesting.push(other);
        other.level ++;
      }
    }
  }

  const allShells = [];
  function collect(level) {
    const shells = loops.filter(l => l.level == level);
    if (shells.length == 0) {
      return;
    }
    for (let shell of shells) {
      shell.nesting = shell.nesting.filter(l => l.level == level + 1);
      allShells.push(shell);
    }
    collect(level + 2);
  }
  collect(0);
  return allShells;
}

function extrudeNestedLoops(sketchedPolygons, normal, target, expansionFactor) {
  const loops = sortPolygons(sketchedPolygons);
  const doExtrude = (polygon) => {
    const extruded = cad_utils.extrude(polygon, normal, target, expansionFactor);
    return CSG.fromPolygons(_triangulateCSG(extruded));
  };
  let blob = null;
  for (let loop of loops) {
    let shell = doExtrude(loop.polygon);
    for (let nestedLoop of loop.nesting) {
      const hole = doExtrude(nestedLoop.polygon);
      shell = shell.subtract(hole);
    }
    if (blob === null) {
      blob = shell;
    } else {
      blob = blob.union(shell);
    }
  }
  return blob;
}

export function extrude(app, request) {
  const face = request.face;
  const sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;
  const normal = cad_utils.vec(face.csgGroup.plane.normal);
  let blob = extrudeNestedLoops(sketchedPolygons, normal, request.params.target, request.params.expansionFactor);
  let solid = request.solids[0];
  if (solid.mergeable) {
    blob = solid.csg.union(blob);
  }
  face.csgGroup.shared.__tcad.faceId += '$';
  return [cad_utils.createSolid(blob, solid.id)];
}

export function cut(app, request) {
  const face = request.face;
  const sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;
  const normal = cad_utils.vec(face.csgGroup.plane.normal);
  let cutter = extrudeNestedLoops(sketchedPolygons, normal, request.params.target, request.params.expansionFactor);

  face.csgGroup.shared.__tcad.faceId += '$';
  var outSolids = [];
  for (var si = 0; si < request.solids.length; si++) {
    let solid = request.solids[si];
    let work = solid.csg;
    let cut = work.subtract(cutter);
    let solidMesh = cad_utils.createSolid(cut, solid.id);
    outSolids.push(solidMesh);
  }
  return outSolids;
}

export function performRevolve(app, request) {
  const face = request.face;
  const sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  const params = request.params;

  const vertices = face.getSketchObjectVerticesIn3D(params.pivotSketchObjectId);
  if (!vertices) {
    return null;
  }
  const axis = [vertices[0], vertices[vertices.length-1]];
  const revolved = revolve(sketchedPolygons, axis, params.angle / 180 * Math.PI, params.resolution);

  const solid = request.solids[0];
  let meld = CSG.fromPolygons(_triangulateCSG(revolved));
  if (solid.mergeable) {
    meld = solid.csg.union(meld);
  }

  face.csgGroup.shared.__tcad.faceId += '$';
  return [cad_utils.createSolid(meld, solid.id)];
}

function _pointOnLine(p, a, b) {

  var ab = a.minus(b);
  var ap = a.minus(p);

  var dp = ab.dot(ap);

  var abLength = ab.length();
  var apLength = ap.length();

  return apLength > 0 && apLength < abLength && areEqual(abLength * apLength, dp, 1E-6);
}

export function polygonsToSegments(polygons) {
  function selfIntersecting(a, b, c) {
    var f = _pointOnLine;
    return f(c, a, b) || f(a, b, c) || f(b, c, a);
  }
  //polygons.filter(function(p) {
  //  
  //});
  //magnitude of cross product is the area of parallelogram
  //var area = points[b].pos.minus(points[a].pos).cross(points[c].pos.minus(points[a].pos)).length() / 2.0;
  //if (selfIntersecting(points[a].pos, points[b].pos, points[c].pos))  {
  //continue;
  //}

  var segmentsByPolygon = [];
  for (var pi = 0; pi < polygons.length; pi++) {
    var segments = [];
    var poly = polygons[pi];
    var p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      var a = poly.vertices[p];
      var b = poly.vertices[q];
      segments.push([a.pos, b.pos]);
    }
    segmentsByPolygon.push(segments);
  }
  return segmentsByPolygon;
}

export function reconstructSketchBounds(csg, face, strict) {
  strict = strict || false;
  var polygons = csg.toPolygons();
  var plane = face.csgGroup.plane;
  var outerEdges = [];
  var planePolygons = [];
  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    if (equal(poly.plane.normal.dot(plane.normal), 1)) {
      if (equal(plane.w, poly.plane.w) && (!strict || !!poly.shared.__tcad && poly.shared.__tcad.faceId  === face.id)) {
        planePolygons.push(poly);
      }
      continue;
    }
    var p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      var a = poly.vertices[p];
      var b = poly.vertices[q];
      var pointAOnPlane = equal(plane.signedDistanceToPoint(a.pos), 0);
      if (!pointAOnPlane) continue;
      var pointBOnPlane = equal(plane.signedDistanceToPoint(b.pos), 0);
      if (pointBOnPlane) {
        outerEdges.push([a.pos, b.pos, poly]);
      }
    }
  }

  var outline = findOutline(planePolygons);

  pickUpCraftInfo(outline, outerEdges);

  return segmentsToPaths(outline).map(poly => poly.vertices);
}

function pickUpCraftInfo(outline, outerEdges) {
  var eq = strictEqual;
  for (var psi1 = 0; psi1 < outline.length; psi1++) {
    var s1 = outline[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
          (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
          _pointOnLine(s1[0], s2[0], s2[1]) || _pointOnLine(s1[1], s2[0], s2[1]))) {
          s1[2] = s2[2];
      }
    }
  }
}

function getOutlineByCollision(segments, outerEdges) {
  var eq = strictEqual;
  var outline = [];
  for (var psi1 = 0; psi1 < segments.length; psi1++) {
    var s1 = segments[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
        (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
        _pointOnLine(s1[0], s2[0], s2[1]) || _pointOnLine(s1[1], s2[0], s2[1]))) {
        outline.push(s1);
      }
    }
  }
  return outline;
}

export function findOutline (planePolygons) {
  var segmentsByPolygon = polygonsToSegments(planePolygons);
  //simplifySegments(segmentsByPolygon);
  var planeSegments = cad_utils.arrFlatten1L(segmentsByPolygon);
  //planeSegments = removeSharedEdges(planeSegments);
  removeTJoints(planeSegments);
  planeSegments = removeSharedEdges(planeSegments);
  return planeSegments;
}

function removeSharedEdges(segments) {
  segments = segments.slice();
  var eq = strictEqual;
  for (var psi1 = 0; psi1 < segments.length; psi1++) {
    var s1 = segments[psi1];
    if (s1 == null) continue;
    for (var psi2 = 0; psi2 < segments.length; psi2++) {
      if (psi1 === psi2) continue;
      var s2 = segments[psi2];
      if (s2 == null) continue;
      if ((eq(s1[0], s2[0]) && eq(s1[1], s2[1]) || (eq(s1[0], s2[1]) && eq(s1[1], s2[0])))) {
        segments[psi1] = null;
        segments[psi2] = null;
      }
    }
  }
  return segments.filter(function(e) {return e !== null});
}

function simplifySegments(polygonToSegments) {
  for (var pi1 = 0; pi1 < polygonToSegments.length; ++pi1) {
    for (var pi2 = 0; pi2 < polygonToSegments.length; ++pi2) {
      if (pi1 === pi2) continue;
      var polygon1 = polygonToSegments[pi1];
      var polygon2 = polygonToSegments[pi2];
      for (var si1 = 0; si1 < polygon1.length; ++si1) {
        var seg1 = polygon1[si1];
        for (var si2 = 0; si2 < polygon2.length; ++si2) {
          var point = polygon2[si2][0];
          if (_pointOnLine(point, seg1[0], seg1[1])) {
            polygon1.push([point, seg1[1]]);
            seg1[1] = point;
          }
        }
      }
    }
  }
}

function _closeFactorToLine(p, seg1, seg2) {

  var a = p.minus(seg1);
  var b = seg2.minus(seg1);
  var bn = b.unit();

  var projLength = bn.dot(a);
  var bx = bn.times(projLength);
  if (!(projLength > 0 && projLength < b.length())) {
    return -1;
  }
  
  var c = a.minus(bx);
  return c.length();    
}

function removeTJoints(segments) {
  var pointIndex = HashTable.forVector3d();

  for (var i = 0; i < segments.length; ++i) {
    pointIndex.put(segments[i][0], 1);
    pointIndex.put(segments[i][1], 1);
  }
  
  var points = pointIndex.getKeys();
  var eq = strictEqual;
  for (var pi1 = 0; pi1 < points.length; ++pi1) {
    var point = points[pi1];
    var best = null, bestFactor;
    for (var pi2 = 0; pi2 < segments.length; ++pi2) {
      var seg = segments[pi2];
      if (eq(seg[0], point) || eq(seg[1], point)) continue;
      var factor = _closeFactorToLine(point, seg[0], seg[1]);
      if (factor != -1 && factor < 1E-6 && (best == null || factor < bestFactor)) {
        best = seg;
        bestFactor = factor;
      }
    }
    if (best != null) {
      segments.push([point, best[1]]);
      best[1] = point;
    }
  }
}

function deleteRedundantPoints(path) {
  var cleanedPath = [];
  //Delete redundant point
  var pathLength = path.length;
  var skipMode = false;
  for (var pi = 0; pi < pathLength; pi++) {
    var bIdx = ((pi + 1) % pathLength);
    var a = path[pi];
    var b = path[bIdx];
    var c = path[(pi + 2) % pathLength];
    var eq = areEqual;
    if (!skipMode) cleanedPath.push(a);
    skipMode = eq(a.minus(b).unit().dot(b.minus(c).unit()), 1, 1E-9);
  }
  return cleanedPath;
}

export function segmentsToPaths(segments) {

  var veq = strictEqual;
  var paths = [];
  var index = HashTable.forVector3d();
  var csgIndex = HashTable.forEdge();

  function indexPoint(p, edge) {
    var edges = index.get(p);
    if (edges === null) {
      edges = [];
      index.put(p, edges);
    }
    edges.push(edge);
  }

  for (var si = 0; si < segments.length; si++) {
    var k = segments[si];
    indexPoint(k[0], k);
    indexPoint(k[1], k);
    var csgInfo = k[2];
    if (csgInfo !== undefined && csgInfo !== null) {
      csgIndex.put([k[0], k[1]], csgInfo);
    }
    k[3] = false;
  }

  function nextPoint(p) {
    var edges = index.get(p);
    if (edges === null) return null;
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      if (edge[3]) continue;
      var res = null;
      if (veq(p, edge[0])) res = edge[1];
      if (veq(p, edge[1])) res = edge[0];
      if (res != null) {
        edge[3] = true;
        return res;
      }
    }
    return null;
  }

  var path;
  for (var ei = 0; ei < segments.length; ei++) {
    var edge = segments[ei];
    if (edge[3]) {
      continue;
    }
    edge[3] = true;
    path = [edge[0], edge[1]];
    paths.push(path);
    var next = nextPoint(edge[1]);
    while (next !== null) {
      if (!veq(next, path[0])) {
        path.push(next);
        next = nextPoint(next);
      } else {
        next = null;
      }
    }
  }

  var filteredPaths = [];
  for (var i = 0; i < paths.length; i++) {
    path = paths[i];

    //Set derived from object to be able to recunstruct
    cad_utils.iteratePath(path, 0, function (a, b) {
      var fromPolygon = csgIndex.get([a, b]);
      if (fromPolygon !== null) {
        if (fromPolygon.shared.__tcad.csgInfo) {
          a.sketchConnectionObject = fromPolygon.shared.__tcad.csgInfo.derivedFrom;
        }
      }
      return true;
    });
    path = deleteRedundantPoints(path);
    if (path.length > 2) {
      filteredPaths.push({
        vertices: path
      });
    }
  }

  return filteredPaths;
}

function _triangulateCSG(polygons) {
  function csgVert(data) {
    return new CSG.Vertex(new CSG.Vector3D(data[0], data[1], data[2]));
  }
  function data(v) {
    return [v.x, v.y, v.z];
  }

  var triangled = [];
  for (let poly of polygons) {
    let vertices = Triangulate([poly.vertices.map(v => data(v.pos))], data(poly.plane.normal));
    for (let i = 0;  i < vertices.length; i += 3 ) {
      var a = csgVert(vertices[i]);
      var b = csgVert(vertices[i + 1]);
      var c = csgVert(vertices[i + 2]);
      var csgPoly = new CSG.Polygon([a, b, c], poly.shared, poly.plane);
      triangled.push(csgPoly);
    }
  }
  return triangled;
}

function splitTwoSegments(a, b) {
  var da = a[1].minus(a[0]);
  var db = b[1].minus(b[0]);
  var dc = b[0].minus(a[0]);

  var daXdb = da.cross(db);
  if (Math.abs(dc.dot(daXdb)) > 1e-6) {
    // lines are not coplanar
    return null;
  }
  var veq = strictEqual;
  if (veq(a[0], b[0]) || veq(a[0], b[1]) || veq(a[1], b[0]) || veq(a[1], b[1])) {
    return null;
  }

  var dcXdb = dc.cross(db);

  function _split(s, ip) {
    if (s[0].equals(ip) || s[1].equals(ip)) {
      return [s];
    }
    return [[s[0], ip, s[2]], [ip, s[1], s[2]]]
  }
  var s = dcXdb.dot(daXdb) / daXdb.lengthSquared();
  if (s > 0.0 && s < 1.0) {
    var ip = a[0].plus(da.times(s));
    return {
      splitterParts : _split(a, ip),
      residual : _split(b, ip)
    }
  }
  return null;
}

function attract(vectors, precision) {
  var eq = areEqual();
  var dist = distanceAB3;
  vectors = vectors.slice();
  for (var i = 0; i < vectors.length; i++) {
    var v1 = vectors[i];
    if (v1 == null) continue;
    for (var j = i + 1; j < vectors.length; j++) {
      var v2 = vectors[j];
      if (v2 == null) continue;
      if (dist(v1, v2) <= precision) {
        Vector.prototype.setV.call(v2, v1);
        vectors[j] = null;
      }
    }
  }
}

function recoverySketchInfo(polygons) {
  var nonStructuralGons = [];
  var sketchEdges = HashTable.forDoubleArray();
  function key(a, b) {return [a.x, a.y, b.x, b.y]}

  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    var paths = [];
    poly.collectPaths(paths);
    var i, path, n, p, q;
    for (i = 0; i < paths.length; i++) {
      path = paths[i];
      if (poly.csgInfo !== undefined && poly.csgInfo.derivedFrom !== undefined) {
        n = path.length;
        for (p =  n - 1, q = 0; q < n ; p = q++ ) {
          sketchEdges.put(key(path[p], path[q]), poly.csgInfo);
        }
      } else {
        nonStructuralGons.push(path);
      }
    }
  }

  for (i = 0; i < nonStructuralGons.length; i++) {
    path = nonStructuralGons[i];
    n = path.length;
    for (p =  n - 1, q = 0; q < n ; p = q++ ) {
      var csgInfo = sketchEdges.get(key(path[p], path[q]));
      if (csgInfo === null) {
        csgInfo = sketchEdges.get(key(path[q], path[p]));
      }
      if (csgInfo) {
        path[p].sketchConnectionObject = csgInfo.derivedFrom;
      }
    }
  }
}

function detach(request) {
  var detachedConfig = {};
  for (var prop in request) {
    if (request.hasOwnProperty(prop)) {
      var value = request[prop];
      if (prop == 'solids') {
        detachedConfig[prop] = value.map(function(s){return s.tCadId});
      } else if (prop == 'face') {
        detachedConfig[prop] = value.id;
      } else if (prop == 'target') {
        detachedConfig[prop] = [value.x, value.y, value.z];
      } else if (prop == 'basis') {
        detachedConfig[prop] = value.map(function(v){return [v.x, v.y, v.z]});
      } else if (prop == 'params') {
        detachedConfig[prop] = detach(value);
      } else {
        detachedConfig[prop] = value;
      }
    }
  }
  return detachedConfig
}

function materialize(index, detachedConfig) {
  var request = {};
  function required(value) {
    if (value == null || value == undefined) throw "value is required";
    return value;
  }
  for (var prop in detachedConfig) {
    if (detachedConfig.hasOwnProperty(prop)) {
      var value = detachedConfig[prop];
      if (prop == 'solids') {
        request[prop] = value.map(function(id){return required(index.solids[id])});
      } else if (prop == 'target') {
        request[prop] = new Vector().set3(value);
      } else if (prop == 'face') {
        request[prop] = required(index.faces[value]);
      } else if (prop == 'basis') {
        request[prop] = value.map(function(v) {return new Vector().set3(v)});
      } else if (prop == 'params') {
        request[prop] = materialize(index, value);
      } else {
        request[prop] = value;
      }
    }
  }
  return request;
}

export const MESH_OPERATIONS = {
  CUT : cut,
  EXTRUDE : extrude,
  REVOLVE : performRevolve,
  PLANE : function(app, request) {
    let basis, depth = request.params.depth;
    const relativeToFaceId = request.params.relativeToFaceId;
    if (relativeToFaceId != undefined && relativeToFaceId != '') {
      const face = app.findFace(relativeToFaceId);
      if (!face) return;
      basis = face.basis();
      depth += face.depth();
    } else {
      basis = request.params.basis;
    }
    return [cad_utils.createPlane(basis, depth)];
  },
  BOX : function(app, request) {
    var p = request.params;
    return [cad_utils.createCSGBox(p.w, p.h, p.d)];
  },
  SPHERE : function(app, request) {
    return [cad_utils.createSphere(request.params.radius)];
  },
  IMPORT_STL: function(app, request) {
    return request.params.objects.map(s => {
      const smoothAngle = 1 / 180 * Math.PI;
      const mesh = Mesh.fromPolygons(s.faces.map(f => f.vertices.map(v => new Vector().set3(v))), smoothAngle);
      const polygons = [];
      for (let meshFace of mesh.faces) {
        const pl = meshFace.polygons[0];
        const plane = new CSG.Plane(pl.normal.csg(), pl.w);
        const shared = cad_utils.createShared();
        meshFace.polygons.map(p => new CSG.Polygon(p.points.map(v => new CSG.Vertex(v.csg())), shared, plane))
          .forEach(p => polygons.push(p));
      }
      return cad_utils.createSolid(CSG.fromPolygons(polygons));
    });
  }
};
