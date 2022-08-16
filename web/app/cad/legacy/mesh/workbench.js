import Vector from 'math/vector';
import * as cad_utils from '../../cad-utils'
import {HashTable} from '../../../utils/hashmap'
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

function _pointOnLine(p, a, b) {

  let ab = a.minus(b);
  let ap = a.minus(p);

  let dp = ab.dot(ap);

  let abLength = ab.length();
  let apLength = ap.length();

  return apLength > 0 && apLength < abLength && areEqual(abLength * apLength, dp, 1E-6);
}

export function polygonsToSegments(polygons) {
  function selfIntersecting(a, b, c) {
    let f = _pointOnLine;
    return f(c, a, b) || f(a, b, c) || f(b, c, a);
  }
  //polygons.filter(function(p) {
  //  
  //});
  //magnitude of cross product is the area of parallelogram
  //let area = points[b].pos.minus(points[a].pos).cross(points[c].pos.minus(points[a].pos)).length() / 2.0;
  //if (selfIntersecting(points[a].pos, points[b].pos, points[c].pos))  {
  //continue;
  //}

  let segmentsByPolygon = [];
  for (let pi = 0; pi < polygons.length; pi++) {
    let segments = [];
    let poly = polygons[pi];
    let p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      let a = poly.vertices[p];
      let b = poly.vertices[q];
      segments.push([a.pos, b.pos]);
    }
    segmentsByPolygon.push(segments);
  }
  return segmentsByPolygon;
}

export function reconstructSketchBounds(csg, face, strict) {
  strict = strict || false;
  let polygons = csg.toPolygons();
  let plane = face.csgGroup.plane;
  let outerEdges = [];
  let planePolygons = [];
  for (let pi = 0; pi < polygons.length; pi++) {
    let poly = polygons[pi];
    if (equal(poly.plane.normal.dot(plane.normal), 1)) {
      if (equal(plane.w, poly.plane.w) && (!strict || !!poly.shared.__tcad && poly.shared.__tcad.faceId  === face.id)) {
        planePolygons.push(poly);
      }
      continue;
    }
    let p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      let a = poly.vertices[p];
      let b = poly.vertices[q];
      let pointAOnPlane = equal(plane.signedDistanceToPoint(a.pos), 0);
      if (!pointAOnPlane) continue;
      let pointBOnPlane = equal(plane.signedDistanceToPoint(b.pos), 0);
      if (pointBOnPlane) {
        outerEdges.push([a.pos, b.pos, poly]);
      }
    }
  }

  let outline = findOutline(planePolygons);

  pickUpCraftInfo(outline, outerEdges);

  return segmentsToPaths(outline).map(poly => poly.vertices);
}

function pickUpCraftInfo(outline, outerEdges) {
  let eq = strictEqual;
  for (let psi1 = 0; psi1 < outline.length; psi1++) {
    let s1 = outline[psi1];
    for (let psi2 = 0; psi2 < outerEdges.length; psi2++) {
      let s2 = outerEdges[psi2];
      if (equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
          (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
          _pointOnLine(s1[0], s2[0], s2[1]) || _pointOnLine(s1[1], s2[0], s2[1]))) {
          s1[2] = s2[2];
      }
    }
  }
}

function getOutlineByCollision(segments, outerEdges) {
  let eq = strictEqual;
  let outline = [];
  for (let psi1 = 0; psi1 < segments.length; psi1++) {
    let s1 = segments[psi1];
    for (let psi2 = 0; psi2 < outerEdges.length; psi2++) {
      let s2 = outerEdges[psi2];
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
  let segmentsByPolygon = polygonsToSegments(planePolygons);
  //simplifySegments(segmentsByPolygon);
  let planeSegments = cad_utils.arrFlatten1L(segmentsByPolygon);
  //planeSegments = removeSharedEdges(planeSegments);
  removeTJoints(planeSegments);
  planeSegments = removeSharedEdges(planeSegments);
  return planeSegments;
}

function removeSharedEdges(segments) {
  segments = segments.slice();
  let eq = strictEqual;
  for (let psi1 = 0; psi1 < segments.length; psi1++) {
    let s1 = segments[psi1];
    if (s1 == null) continue;
    for (let psi2 = 0; psi2 < segments.length; psi2++) {
      if (psi1 === psi2) continue;
      let s2 = segments[psi2];
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
  for (let pi1 = 0; pi1 < polygonToSegments.length; ++pi1) {
    for (let pi2 = 0; pi2 < polygonToSegments.length; ++pi2) {
      if (pi1 === pi2) continue;
      let polygon1 = polygonToSegments[pi1];
      let polygon2 = polygonToSegments[pi2];
      for (let si1 = 0; si1 < polygon1.length; ++si1) {
        let seg1 = polygon1[si1];
        for (let si2 = 0; si2 < polygon2.length; ++si2) {
          let point = polygon2[si2][0];
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

  let a = p.minus(seg1);
  let b = seg2.minus(seg1);
  let bn = b.unit();

  let projLength = bn.dot(a);
  let bx = bn.times(projLength);
  if (!(projLength > 0 && projLength < b.length())) {
    return -1;
  }
  
  let c = a.minus(bx);
  return c.length();    
}

function removeTJoints(segments) {
  let pointIndex = HashTable.forVector3d();

  for (let i = 0; i < segments.length; ++i) {
    pointIndex.put(segments[i][0], 1);
    pointIndex.put(segments[i][1], 1);
  }
  
  let points = pointIndex.getKeys();
  let eq = strictEqual;
  for (let pi1 = 0; pi1 < points.length; ++pi1) {
    let point = points[pi1];
    let best = null, bestFactor;
    for (let pi2 = 0; pi2 < segments.length; ++pi2) {
      let seg = segments[pi2];
      if (eq(seg[0], point) || eq(seg[1], point)) continue;
      let factor = _closeFactorToLine(point, seg[0], seg[1]);
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
  let cleanedPath = [];
  //Delete redundant point
  let pathLength = path.length;
  let skipMode = false;
  for (let pi = 0; pi < pathLength; pi++) {
    let bIdx = ((pi + 1) % pathLength);
    let a = path[pi];
    let b = path[bIdx];
    let c = path[(pi + 2) % pathLength];
    let eq = areEqual;
    if (!skipMode) cleanedPath.push(a);
    skipMode = eq(a.minus(b).unit().dot(b.minus(c).unit()), 1, 1E-9);
  }
  return cleanedPath;
}

export function segmentsToPaths(segments) {

  let veq = strictEqual;
  let paths = [];
  let index = HashTable.forVector3d();
  let csgIndex = HashTable.forEdge();

  function indexPoint(p, edge) {
    let edges = index.get(p);
    if (edges === null) {
      edges = [];
      index.put(p, edges);
    }
    edges.push(edge);
  }

  for (let si = 0; si < segments.length; si++) {
    let k = segments[si];
    indexPoint(k[0], k);
    indexPoint(k[1], k);
    let csgInfo = k[2];
    if (csgInfo !== undefined && csgInfo !== null) {
      csgIndex.put([k[0], k[1]], csgInfo);
    }
    k[3] = false;
  }

  function nextPoint(p) {
    let edges = index.get(p);
    if (edges === null) return null;
    for (let i = 0; i < edges.length; i++) {
      let edge = edges[i];
      if (edge[3]) continue;
      let res = null;
      if (veq(p, edge[0])) res = edge[1];
      if (veq(p, edge[1])) res = edge[0];
      if (res != null) {
        edge[3] = true;
        return res;
      }
    }
    return null;
  }

  let path;
  for (let ei = 0; ei < segments.length; ei++) {
    let edge = segments[ei];
    if (edge[3]) {
      continue;
    }
    edge[3] = true;
    path = [edge[0], edge[1]];
    paths.push(path);
    let next = nextPoint(edge[1]);
    while (next !== null) {
      if (!veq(next, path[0])) {
        path.push(next);
        next = nextPoint(next);
      } else {
        next = null;
      }
    }
  }

  let filteredPaths = [];
  for (let i = 0; i < paths.length; i++) {
    path = paths[i];

    //Set derived from object to be able to recunstruct
    cad_utils.iteratePath(path, 0, function (a, b) {
      let fromPolygon = csgIndex.get([a, b]);
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

  let triangled = [];
  for (let poly of polygons) {
    let vertices = Triangulate([poly.vertices.map(v => data(v.pos))], data(poly.plane.normal));
    for (let i = 0;  i < vertices.length; i += 3 ) {
      let a = csgVert(vertices[i]);
      let b = csgVert(vertices[i + 1]);
      let c = csgVert(vertices[i + 2]);
      let csgPoly = new CSG.Polygon([a, b, c], poly.shared, poly.plane);
      triangled.push(csgPoly);
    }
  }
  return triangled;
}

function splitTwoSegments(a, b) {
  let da = a[1].minus(a[0]);
  let db = b[1].minus(b[0]);
  let dc = b[0].minus(a[0]);

  let daXdb = da.cross(db);
  if (Math.abs(dc.dot(daXdb)) > 1e-6) {
    // lines are not coplanar
    return null;
  }
  let veq = strictEqual;
  if (veq(a[0], b[0]) || veq(a[0], b[1]) || veq(a[1], b[0]) || veq(a[1], b[1])) {
    return null;
  }

  let dcXdb = dc.cross(db);

  function _split(s, ip) {
    if (s[0].equals(ip) || s[1].equals(ip)) {
      return [s];
    }
    return [[s[0], ip, s[2]], [ip, s[1], s[2]]]
  }
  let s = dcXdb.dot(daXdb) / daXdb.lengthSquared();
  if (s > 0.0 && s < 1.0) {
    let ip = a[0].plus(da.times(s));
    return {
      splitterParts : _split(a, ip),
      residual : _split(b, ip)
    }
  }
  return null;
}

function attract(vectors, precision) {
  let eq = areEqual();
  let dist = distanceAB3;
  vectors = vectors.slice();
  for (let i = 0; i < vectors.length; i++) {
    let v1 = vectors[i];
    if (v1 == null) continue;
    for (let j = i + 1; j < vectors.length; j++) {
      let v2 = vectors[j];
      if (v2 == null) continue;
      if (dist(v1, v2) <= precision) {
        Vector.prototype.setV.call(v2, v1);
        vectors[j] = null;
      }
    }
  }
}


