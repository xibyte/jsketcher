import Vector from '../math/vector'
import * as cad_utils from './cad-utils'
import * as math from '../math/math'
import {LUT} from '../math/bezier-cubic'
import {Matrix3, AXIS, ORIGIN} from '../math/l3space'
import {HashTable} from '../utils/hashmap'
import Counters from './counters'
import {Mesh} from './mesh'
import {LoadSTLFromURL} from './io'
import revolve from './revolve'

function SketchConnection(a, b, sketchObject) {
  this.a = a;
  this.b = b;
  this.sketchObject = sketchObject;
}

var _SKETCH_OBJ_COUNTER = 0;
export function readSketchGeom(sketch) {
  function genId() {
    return _SKETCH_OBJ_COUNTER++;
  }
  function createData(obj) {
    return {_class : obj._class, id : genId()}
  }
  
  const RESOLUTION = 20;
  const out = {connections : [], loops : []};
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      const layer = sketch.layers[l];
      if (layer.name == "_construction_") continue;
      for (var i = 0; i < layer.data.length; ++i) {
        const obj = layer.data[i];
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          const segA = new Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          const segB = new Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          out.connections.push(new SketchConnection(segA, segB, createData(obj)));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          const arcA = new Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          const arcB = new Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          const arcCenter = new Vector(obj.points[2][1][1], obj.points[2][2][1], 0);
          const approxedArc = approxArc(arcA, arcB, arcCenter, RESOLUTION);
          const arcData =  createData(obj);
          for (let j = 0; j < approxedArc.length - 1; j++) {
            out.connections.push(new SketchConnection(approxedArc[j], approxedArc[j+1], arcData));
          }
        } else if (obj._class === 'TCAD.TWO.EllipticalArc') {
          const ep1 = ReadSketchPoint(obj.ep1);
          const ep2 = ReadSketchPoint(obj.ep2);
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          const r = obj.r;
          const approxedEllArc = approxEllipticalArc(ep1, ep2, a, b, r, RESOLUTION);
          const arcData =  createData(obj);
          for (let j = 0; j < approxedEllArc.length - 1; j++) {
            out.connections.push(new SketchConnection(approxedEllArc[j], approxedEllArc[j+1], arcData));
          }
        } else if (obj._class === 'TCAD.TWO.BezierCurve') {
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          const cp1 = ReadSketchPoint(obj.cp1);
          const cp2 = ReadSketchPoint(obj.cp2);
          const approxedCurve = approxBezierCurve(a, b, cp1, cp2, RESOLUTION);
          const curvedData =  createData(obj);
          for (let j = 0; j < approxedCurve.length - 1; j++) {
            out.connections.push(new SketchConnection(approxedCurve[j], approxedCurve[j+1], curvedData));
          }
        } else if (obj._class === 'TCAD.TWO.Circle') {
          const circleCenter = new Vector(obj.c[1][1], obj.c[2][1], 0);
          const approxedCircle = approxCircle(circleCenter, obj.r, RESOLUTION);
          const circleData =  createData(obj);
          const loop = [];
          let p, q, n = approxedCircle.length;
          for (p = n - 1, q = 0; q < n; p = q++) {
            loop.push(new SketchConnection(approxedCircle[p], approxedCircle[q], circleData));
          }
          out.loops.push(loop);
        }
      }
    }
  }
  return out;
}

function ReadSketchPoint(arr) {
  return new Vector(arr[1][1], arr[2][1], 0)
}

export function approxArc(ao, bo, c, resolution) {
  var a = ao.minus(c);
  var b = bo.minus(c);
  var points = [ao];
  var abAngle = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  if (abAngle > Math.PI * 2) abAngle = Math.PI / 2 - abAngle;
  if (abAngle < 0) abAngle = Math.PI * 2 + abAngle;

  var r = a.length();
  resolution = 1;
  //var step = Math.acos(1 - ((resolution * resolution) / (2 * r * r)));
  var step = resolution / (2 * Math.PI);
  var k = Math.round(abAngle / step);
  var angle = Math.atan2(a.y, a.x) + step;

  for (var i = 0; i < k - 1; ++i) {
    points.push(new Vector(c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)));
    angle += step;
  }
  points.push(bo);
  return points;
}

export function approxEllipticalArc(ep1, ep2, ao, bo, radiusY, resolution) {
  const axisX = ep2.minus(ep1);
  const radiusX = axisX.length() * 0.5;
  axisX._normalize();
  const c = ep1.plus(axisX.multiply(radiusX));
  const a = ao.minus(c);
  const b = bo.minus(c);
  const points = [ao];
  const rotation = Math.atan2(axisX.y, axisX.x);
  let abAngle = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  if (abAngle > Math.PI * 2) abAngle = Math.PI / 2 - abAngle;
  if (abAngle < 0) abAngle = Math.PI * 2 + abAngle;

  const sq = (a) => a * a; 

  resolution = 1;

  const step = resolution / (2 * Math.PI);
  const k = Math.round(abAngle / step);
  let angle = Math.atan2(a.y, a.x) + step - rotation;

  for (let i = 0; i < k - 1; ++i) {
    const r = Math.sqrt(1/( sq(Math.cos(angle)/radiusX) + sq(Math.sin(angle)/radiusY)));
    points.push(new Vector(c.x + r*Math.cos(angle + rotation), c.y + r*Math.sin(angle + rotation)));
    angle += step;
  }
  points.push(bo);
  return points;
}

export function approxCircle(c, r, resolution) {
  var points = [];

  resolution = 1;
  //var step = Math.acos(1 - ((resolution * resolution) / (2 * r * r)));
  var step = resolution / (2 * Math.PI);
  var k = Math.round((2 * Math.PI) / step);

  for (var i = 0, angle = 0; i < k; ++i, angle += step) {
    points.push(new Vector(c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)));
  }
  return points;
}

export function approxBezierCurve(a, b, cp1, cp2, resolution) {
  return LUT(a, b, cp1, cp2, 10);
}

export function getSketchedPolygons3D(app, face) {

  var savedFace = localStorage.getItem(app.faceStorageKey(face.id));
  if (savedFace == null) return null;

  var geom = readSketchGeom(JSON.parse(savedFace));
  var polygons2D = cad_utils.sketchToPolygons(geom);

  var normal = face.csgGroup.normal;
  var depth = null;
  var sketchedPolygons = [];
  for (var i = 0; i < polygons2D.length; i++) {
    var poly2D = polygons2D[i];
    if (poly2D.length < 3) continue;

    if (depth == null) {
      var _3dTransformation = new Matrix3().setBasis(face.basis());
      //we lost depth or z off in 2d sketch, calculate it again
      depth = face.csgGroup.plane.w;
    }

    var polygon = [];
    for (var m = 0; m < poly2D.length; ++m) {
      var vec = poly2D[m];
      vec.z = depth;
//      var a = _3dTransformation.apply(new Vector(poly2D[m][0], poly2D[m][1], depth));
      var a = _3dTransformation.apply(vec);
      a.sketchConnectionObject = vec.sketchConnectionObject;
      polygon.push(a);
    }

    sketchedPolygons.push(polygon);
  }
  return sketchedPolygons;
}

export function extrude(app, request) {
  var face = request.face;
  var sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var normal = cad_utils.vec(face.csgGroup.plane.normal);
  var toMeldWith = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = cad_utils.extrude(sketchedPolygons[i], normal, request.params.target, request.params.expansionFactor );
    toMeldWith = toMeldWith.concat(extruded);
  }

  var solid = request.solids[0];

  var meld = CSG.fromPolygons(_triangulateCSG(toMeldWith));
  if (solid.mergeable) {
    meld = solid.csg.union(meld);
  }

  face.csgGroup.shared.__tcad.faceId += '$';
  return [cad_utils.createSolid(meld, solid.id)];
}

export function performRevolve(app, request) {
  const face = request.face;
  const sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  const revolved = revolve(sketchedPolygons, sketchedPolygons[0], request.params.angle / 180 * Math.PI, request.params.resolution);

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

  return apLength > 0 && apLength < abLength && math.areEqual(abLength * apLength, dp, 1E-6);
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
    if (math.equal(poly.plane.normal.dot(plane.normal), 1)) {
      if (math.equal(plane.w, poly.plane.w) && (!strict || !!poly.shared.__tcad && poly.shared.__tcad.faceId  === face.id)) {
        planePolygons.push(poly);
      }
      continue;
    }
    var p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      var a = poly.vertices[p];
      var b = poly.vertices[q];
      var pointAOnPlane = math.equal(plane.signedDistanceToPoint(a.pos), 0);
      if (!pointAOnPlane) continue;
      var pointBOnPlane = math.equal(plane.signedDistanceToPoint(b.pos), 0);
      if (pointBOnPlane) {
        outerEdges.push([a.pos, b.pos, poly]);
      }
    }
  }

  var outline = findOutline(planePolygons);

  pickUpCraftInfo(outline, outerEdges);

  return segmentsToPaths(outline);
}

function pickUpCraftInfo(outline, outerEdges) {
  var eq = math.strictEqual;
  for (var psi1 = 0; psi1 < outline.length; psi1++) {
    var s1 = outline[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (math.equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
          (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
          _pointOnLine(s1[0], s2[0], s2[1]) || _pointOnLine(s1[1], s2[0], s2[1]))) {
          s1[2] = s2[2];
      }
    }
  }
}

function getOutlineByCollision(segments, outerEdges) {
  var eq = math.strictEqual;
  var outline = [];
  for (var psi1 = 0; psi1 < segments.length; psi1++) {
    var s1 = segments[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (math.equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
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
  var eq = math.strictEqual;
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
  var eq = math.strictEqual;
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
    var eq = math.areEqual;
    if (!skipMode) cleanedPath.push(a);
    skipMode = eq(a.minus(b).unit().dot(b.minus(c).unit()), 1, 1E-9);
  }
  return cleanedPath;
}

export function segmentsToPaths(segments) {

  var veq = math.strictEqual;
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
  function csgVec(v) {
    return new CSG.Vector3D(v.x, v.y, v.z);
  }
  var triangled = [];
  for (var ei = 0; ei < polygons.length; ++ei) {
    var poly = polygons[ei];
    var points = poly.vertices;
    var refs = cad_utils.triangulate(points, poly.plane.normal);
    for ( var i = 0;  i < refs.length; ++ i ) {
      var a = refs[i][0];
      var b = refs[i][1];
      var c = refs[i][2];
      var csgPoly = new CSG.Polygon([points[a], points[b], points[c]], poly.shared, poly.plane);
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
  var veq = math.strictEqual;
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
  var eq = math.areEqual();
  var dist = math.distanceAB3;
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

export function cut(app, request) {
  var face = request.face;
  var sketchedPolygons = getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var normal = cad_utils.vec(face.csgGroup.plane.normal);
  var cutter = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = cad_utils.extrude(sketchedPolygons[i], normal, request.params.target, request.params.expansionFactor );
    cutter = cutter.concat(extruded);
  }
  var cutterCSG = CSG.fromPolygons(_triangulateCSG(cutter));

  face.csgGroup.shared.__tcad.faceId += '$';
  var outSolids = [];
  for (var si = 0; si < request.solids.length; si++) {
    var solid = request.solids[si];
    var work = solid.csg;
    var cut = work.subtract(cutterCSG);
    var solidMesh = cad_utils.createSolid(cut, solid.id);
    outSolids.push(solidMesh);
  }
  return outSolids;
}

export function Craft(app) {
  this.app = app;
  this.history = [];
  this.solids = [];
  this._historyPointer = 0;
  Object.defineProperty(this, "historyPointer", {
    get: function() {return this._historyPointer},
    set: function(value) {
      if (this._historyPointer === value) return; 
      this._historyPointer = value;
      this.reset(this.history.slice(0, this._historyPointer));
      this.app.bus.notify('craft');
      this.app.bus.notify('historyPointer');
      this.app.viewer.render();
    }
  });
}

Craft.prototype.loadHistory = function(history) {
  this.history = history;
  this._historyPointer = history.length;
  this.reset(history);
  this.app.bus.notify('craft');
  this.app.bus.notify('historyPointer');
  this.app.viewer.render();
};

Craft.prototype.reset = function(modifications) {
  Counters.solid = 0;
  Counters.shared = 0;
  this.solids = [];
  this.app.findAllSolids().forEach(function(s) {s.vanish()});
  for (var i = 0; i < modifications.length; i++) {
    var request = materialize(this.app.indexEntities(), modifications[i]);
    this.modifyInternal(request);
  }
};

Craft.prototype.finishHistoryEditing = function() {
  this.loadHistory(this.history);
};

Craft.prototype.current = function() {
  return this.history[this.history.length - 1];
};

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

Craft.prototype.modifyInternal = function(request) {
  var op = OPERATIONS[request.type];
  if (!op) return;

  var newSolids = op(this.app, request);
  if (newSolids == null) return;
    const toUpdate = [];
    for (let i = 0; i < request.solids.length; i++) {
      let solid = request.solids[i];
      var indexToRemove = this.solids.indexOf(solid);
      if (indexToRemove != -1) {
        let updatedIdx = newSolids.findIndex((s) => s.id == solid.id);
        if (updatedIdx != -1) {
          toUpdate[updatedIdx] = indexToRemove;
        } else {
          this.solids.splice(indexToRemove, 1);
        }
      }
      solid.vanish();
    }
    for (let i = 0; i < newSolids.length; i++) {
      let solid = newSolids[i];
      if (toUpdate[i] !== undefined) {
        this.solids[toUpdate[i]] = solid;
      } else {
        this.solids.push(solid);
      }
      this.app.viewer.workGroup.add(solid.cadGroup);
    }
    this.app.bus.notify('solid-list', {
      solids: this.solids,
      needRefresh: newSolids
    });
};

Craft.prototype.modify = function(request, overriding) {
  this.modifyInternal(request);
  var detachedRequest = detach(request);
  if (!overriding && this._historyPointer != this.history.length) {
    this.history.splice(this._historyPointer + 1, 0, null);
  }
  this.history[this._historyPointer] = detachedRequest;
  this._historyPointer ++;
  this.app.bus.notify('craft');
  this.app.bus.notify('historyPointer');
  this.app.viewer.render();
};

export const OPERATIONS = {
  CUT : cut,
  PAD : extrude,
  REVOLVE : performRevolve,
  PLANE : function(app, request) {
    return [cad_utils.createPlane(request.params.basis, request.params.depth)];
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
