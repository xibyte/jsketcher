TCAD.workbench = {};

TCAD.workbench.SketchConnection = function(a, b, sketchObject) {
  this.a = a;
  this.b = b;
  this.sketchObject = sketchObject;
};

TCAD.workbench._SKETCH_OBJ_COUNTER = 0;
TCAD.workbench.readSketchGeom = function(sketch) {
  function genId() {
    return TCAD.workbench._SKETCH_OBJ_COUNTER++;
  }
  var out = {connections : [], loops : []};
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].data.length; ++i) {
        var obj = sketch.layers[l].data[i];
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          var a = new TCAD.Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          var b = new TCAD.Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          out.connections.push(new TCAD.workbench.SketchConnection(a, b, {_class : obj._class, id : genId()}));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          var a = new TCAD.Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          var b = new TCAD.Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          var center = new TCAD.Vector(obj.points[2][1][1], obj.points[2][2][1], 0);
          var approxArc = TCAD.workbench.approxArc(a, b, center, 20);
          var data =  {_class : obj._class, id : genId()};
          for (var j = 0; j < approxArc.length - 1; j++) {
            out.connections.push(new TCAD.workbench.SketchConnection(approxArc[j], approxArc[j+1], data));
          }
        } else if (obj._class === 'TCAD.TWO.Circle') {
          var center = new TCAD.Vector(obj.c[1][1], obj.c[2][1], 0);
          var approxCircle = TCAD.workbench.approxCircle(center, obj.r, 20);
          var data =  {_class : obj._class, id : genId()};
          var loop = [];
          var p, q, n = approxCircle.length;
          for (var p = n - 1, q = 0; q < n; p = q++) {
            loop.push(new TCAD.workbench.SketchConnection(approxCircle[p], approxCircle[q], data));
          }
          out.loops.push(loop);
        }
      }
    }
  }
  return out;
};

TCAD.workbench.approxArc = function(ao, bo, c, resolution) {
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
    points.push(new TCAD.Vector(c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)));
    angle += step;
  }
  points.push(bo);
  return points;
};

TCAD.workbench.approxCircle = function(c, r, resolution) {
  var points = [];

  resolution = 1;
  //var step = Math.acos(1 - ((resolution * resolution) / (2 * r * r)));
  var step = resolution / (2 * Math.PI);
  var k = Math.round((2 * Math.PI) / step);

  for (var i = 0, angle = 0; i < k; ++i, angle += step) {
    points.push(new TCAD.Vector(c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)));
  }
  return points;
};

TCAD.workbench.serializeSolid = function(solid) {
  var data = {};
  data.faceCounter = TCAD.geom.FACE_COUNTER;
  for (var fi = 0; fi < solid.faces.length; ++fi) {
    var face = solid.faces[fi];
    var faceData = {};
    faceData.id = face.id;
  }
  return data;
};

TCAD.craft = {};

TCAD.craft.getSketchedPolygons3D = function(app, face) {

  var savedFace = localStorage.getItem(app.faceStorageKey(face.id));
  if (savedFace == null) return null;

  var geom = TCAD.workbench.readSketchGeom(JSON.parse(savedFace));
  var polygons2D = TCAD.utils.sketchToPolygons(geom);

  var normal = face.csgGroup.normal;
  var depth = null;
  var sketchedPolygons = [];
  for (var i = 0; i < polygons2D.length; i++) {
    var poly2D = polygons2D[i];
    if (poly2D.length < 3) continue;

    if (depth == null) {
      var _3dTransformation = new TCAD.Matrix().setBasis(face.basis());
      //we lost depth or z off in 2d sketch, calculate it again
      depth = face.csgGroup.plane.w;
    }

    var polygon = [];
    for (var m = 0; m < poly2D.length; ++m) {
      var vec = poly2D[m];
      vec.z = depth;
//      var a = _3dTransformation.apply(new TCAD.Vector(poly2D[m][0], poly2D[m][1], depth));
      var a = _3dTransformation.apply(vec);
      a.sketchConnectionObject = vec.sketchConnectionObject;
      polygon.push(a);
    }

    sketchedPolygons.push(polygon);
  }
  return sketchedPolygons;
};

TCAD.craft.extrude = function(app, request) {
  var face = request.face;
  var sketchedPolygons = TCAD.craft.getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var normal = TCAD.utils.vec(face.csgGroup.plane.normal);
  var toMeldWith = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal, request.params.target, request.params.expansionFactor );
    toMeldWith = toMeldWith.concat(extruded);
  }

  var solid = request.solids[0];

  var meld = CSG.fromPolygons(TCAD.craft._triangulateCSG(toMeldWith));
  if (solid.mergeable) {
    meld = solid.csg.union(meld);
  }

  face.csgGroup.shared.__tcad.faceId += '$';
  return [TCAD.utils.createSolidMesh(meld).geometry];
};

TCAD.craft._pointOnLine = function(p, a, b) {

  var ab = a.minus(b);
  var ap = a.minus(p);

  var dp = ab.dot(ap);

  var abLength = ab.length();
  var apLength = ap.length();

  return apLength > 0 && apLength < abLength && TCAD.utils.areEqual(abLength * apLength, dp, 1E-6);
};

TCAD.craft.polygonsToSegments = function(polygons) {
  function selfIntersecting(a, b, c) {
    var f = TCAD.craft._pointOnLine;
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
};  

TCAD.craft.reconstructSketchBounds = function(csg, face, strict) {
  strict = strict || false;
  var polygons = csg.toPolygons();
  var plane = face.csgGroup.plane;
  var outerEdges = [];
  var planePolygons = [];
  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    if (TCAD.utils.equal(poly.plane.normal.dot(plane.normal), 1)) {
      if (TCAD.utils.equal(plane.w, poly.plane.w) && (!strict || !!poly.shared.__tcad && poly.shared.__tcad.faceId  === face.id)) {
        planePolygons.push(poly);
      }
      continue;
    }
    var p, q, n = poly.vertices.length;
    for(p = n - 1, q = 0; q < n; p = q ++) {
      var a = poly.vertices[p];
      var b = poly.vertices[q];
      var pointAOnPlane = TCAD.utils.equal(plane.signedDistanceToPoint(a.pos), 0);
      if (!pointAOnPlane) continue;
      var pointBOnPlane = TCAD.utils.equal(plane.signedDistanceToPoint(b.pos), 0);
      if (pointBOnPlane) {
        outerEdges.push([a.pos, b.pos, poly]);
      }
    }
  }

  var outline = TCAD.craft.findOutline(planePolygons);

  TCAD.craft.pickUpCraftInfo(outline, outerEdges);

  return TCAD.craft.segmentsToPaths(outline);
};

TCAD.craft.pickUpCraftInfo = function(outline, outerEdges) {
  var eq = TCAD.utils.strictEqual;
  for (var psi1 = 0; psi1 < outline.length; psi1++) {
    var s1 = outline[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (TCAD.utils.equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
          (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
          TCAD.craft._pointOnLine(s1[0], s2[0], s2[1]) || TCAD.craft._pointOnLine(s1[1], s2[0], s2[1]))) {
          s1[2] = s2[2];
      }
    }
  }
};


TCAD.craft.getOutlineByCollision = function(segments, outerEdges) {
  var eq = TCAD.utils.strictEqual;
  var outline = [];
  for (var psi1 = 0; psi1 < segments.length; psi1++) {
    var s1 = segments[psi1];
    for (var psi2 = 0; psi2 < outerEdges.length; psi2++) {
      var s2 = outerEdges[psi2];
      if (TCAD.utils.equal(Math.abs(s1[0].minus(s1[1]).unit().dot(s2[0].minus(s2[1]).unit())), 1) &&
        (eq(s1[0], s2[0]) || eq(s1[1], s2[1]) || eq(s1[0], s2[1]) || eq(s1[1], s2[0]) ||
        TCAD.craft._pointOnLine(s1[0], s2[0], s2[1]) || TCAD.craft._pointOnLine(s1[1], s2[0], s2[1]))) {
        outline.push(s1);
      }
    }
  }
  return outline;
};

 TCAD.craft.findOutline = function(planePolygons, outer) {
  var segmentsByPolygon = TCAD.craft.polygonsToSegments(planePolygons);
  //TCAD.craft.simplifySegments(segmentsByPolygon);
  var planeSegments = TCAD.utils.arrFlatten1L(segmentsByPolygon);
  //planeSegments = TCAD.craft.removeSharedEdges(planeSegments);
  TCAD.craft.removeTJoints(planeSegments);
  planeSegments = TCAD.craft.removeSharedEdges(planeSegments);
  return planeSegments;
};

TCAD.craft.removeSharedEdges = function(segments) {
  segments = segments.slice();
  var eq = TCAD.utils.strictEqual;
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
};

TCAD.craft.simplifySegments = function(polygonToSegments) {
  for (var pi1 = 0; pi1 < polygonToSegments.length; ++pi1) {
    for (var pi2 = 0; pi2 < polygonToSegments.length; ++pi2) {
      if (pi1 === pi2) continue;
      var polygon1 = polygonToSegments[pi1];
      var polygon2 = polygonToSegments[pi2];
      for (var si1 = 0; si1 < polygon1.length; ++si1) {
        var seg1 = polygon1[si1];
        for (var si2 = 0; si2 < polygon2.length; ++si2) {
          var point = polygon2[si2][0];
          if (TCAD.craft._pointOnLine(point, seg1[0], seg1[1])) {
            polygon1.push([point, seg1[1]]);
            seg1[1] = point;
          }
        }
      }
    }
  }
};

TCAD.craft._closeFactorToLine = function(p, seg1, seg2) {

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
};

TCAD.craft.removeTJoints = function(segments) {
  var pointIndex = TCAD.struct.hashTable.forVector3d();

  for (var i = 0; i < segments.length; ++i) {
    pointIndex.put(segments[i][0], 1);
    pointIndex.put(segments[i][1], 1);
  }
  
  var points = pointIndex.getKeys();
  var eq = TCAD.utils.strictEqual;
  for (var pi1 = 0; pi1 < points.length; ++pi1) {
    var point = points[pi1];
    var best = null, bestFactor;
    for (var pi2 = 0; pi2 < segments.length; ++pi2) {
      var seg = segments[pi2];
      if (eq(seg[0], point) || eq(seg[1], point)) continue;
      var factor = TCAD.craft._closeFactorToLine(point, seg[0], seg[1]);
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
};


TCAD.craft.deleteRedundantPoints = function(path) {
  var cleanedPath = [];
  //Delete redundant point
  var pathLength = path.length;
  var skipMode = false;
  for (var pi = 0; pi < pathLength; pi++) {
    var bIdx = ((pi + 1) % pathLength);
    var a = path[pi];
    var b = path[bIdx];
    var c = path[(pi + 2) % pathLength];
    var eq = TCAD.utils.areEqual;
    if (!skipMode) cleanedPath.push(a);
    skipMode = eq(a.minus(b).unit().dot(b.minus(c).unit()), 1, 1E-9);
  }
  return cleanedPath;
};

TCAD.craft.segmentsToPaths = function(segments) {

  var veq = TCAD.struct.hashTable.vectorEquals;

  var paths = [];
  var index = TCAD.struct.hashTable.forVector3d();
  var csgIndex = TCAD.struct.hashTable.forEdge();

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

  for (var ei = 0; ei < segments.length; ei++) {
    var edge = segments[ei];
    if (edge[3]) {
      continue;
    }
    edge[3] = true;
    var path = [edge[0], edge[1]];
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
    var path = paths[i];

    //Set derived from object to be able to recunstruct
    TCAD.utils.iteratePath(path, 0, function (a, b) {
      var fromPolygon = csgIndex.get([a, b]);
      if (fromPolygon !== null) {
        if (fromPolygon.shared.__tcad.csgInfo) {
          a.sketchConnectionObject = fromPolygon.shared.__tcad.csgInfo.derivedFrom;
        }
      }
      return true;
    });
    path = TCAD.craft.deleteRedundantPoints(path);
    if (path.length > 2) {
      filteredPaths.push({
        vertices: path
      });
    }
  }

  return filteredPaths;
};

TCAD.craft._triangulateCSG = function(polygons) {
  function csgVec(v) {
    return new CSG.Vector3D(v.x, v.y, v.z);
  }
  var triangled = [];
  for (var ei = 0; ei < polygons.length; ++ei) {
    var poly = polygons[ei];
    var points = poly.vertices;
    var refs = TCAD.geom.triangulate(points, poly.plane.normal);
    for ( var i = 0;  i < refs.length; ++ i ) {
      var a = refs[i][0];
      var b = refs[i][1];
      var c = refs[i][2];
      var csgPoly = new CSG.Polygon([points[a], points[b], points[c]], poly.shared, poly.plane);
      triangled.push(csgPoly);
    }
  }
  return triangled;
};

TCAD.craft.splitTwoSegments = function (a, b) {
  var da = a[1].minus(a[0]);
  var db = b[1].minus(b[0]);
  var dc = b[0].minus(a[0]);

  var daXdb = da.cross(db);
  if (Math.abs(dc.dot(daXdb)) > 1e-6) {
    // lines are not coplanar
    return null;
  }
  var veq = TCAD.utils.vectorsEqual;
  if (veq(a[0], b[0]) || veq(a[0], b[1]) || veq(a[1], b[0]) || veq(a[1], b[1])) {
    return null;
  }

  var dcXdb = dc.cross(db);

  var s = dcXdb.dot(daXdb) / daXdb.lengthSquared();
  if (s > 0.0 && s < 1.0) {
    var ip = a[0].plus(da.times(s));
    function _split(s, ip) {
      if (s[0].equals(ip) || s[1].equals(ip)) {
        return [s];
      }
      return [[s[0], ip, s[2]], [ip, s[1], s[2]]]
    }

    return {
      splitterParts : _split(a, ip),
      residual : _split(b, ip)
    }
  }
  return null;
};

TCAD.craft.attract = function(vectors, precision) {
  var eq = TCAD.utils.areEqual();
  var dist = TCAD.math.distanceAB3;
  vectors = vectors.slice();
  for (var i = 0; i < vectors.length; i++) {
    var v1 = vectors[i];
    if (v1 == null) continue;
    for (var j = i + 1; j < vectors.length; j++) {
      var v2 = vectors[j];
      if (v2 == null) continue;
      if (dist(v1, v2) <= precision) {
        TCAD.Vector.prototype.setV.call(v2, v1);
        vectors[j] = null;
      }
    }
  }
};

TCAD.craft.recoverySketchInfo = function(polygons) {
  var nonStructuralGons = [];
  var sketchEdges = TCAD.struct.hashTable.forDoubleArray();
  function key(a, b) {return [a.x, a.y, b.x, b.y]};

  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    var paths = [];
    poly.collectPaths(paths);
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      if (poly.csgInfo !== undefined && poly.csgInfo.derivedFrom !== undefined) {
        var n = path.length;
        for (var p =  n - 1, q = 0; q < n ; p = q++ ) {
          sketchEdges.put(key(path[p], path[q]), poly.csgInfo);
        }
      } else {
        nonStructuralGons.push(path);
      }
    }
  }

  for (var i = 0; i < nonStructuralGons.length; i++) {
    var path = nonStructuralGons[i];
    var n = path.length;
    for (var p =  n - 1, q = 0; q < n ; p = q++ ) {
      var csgInfo = sketchEdges.get(key(path[p], path[q]));
      if (csgInfo === null) {
        csgInfo = sketchEdges.get(key(path[q], path[p]));
      }
      if (csgInfo) {
        path[p].sketchConnectionObject = csgInfo.derivedFrom;
      }
    }
  }
};

TCAD.craft.reconstruct = function (cut) {
  function pInP(p1, p2) {
    var notEqPoints = [];

    for (var i = 0; i < p1.length; ++i) {
      var v1 = p1[i];
      for (var j = 0; j < p2.length; ++j) {
        var v2 = p2[j];
        if (!v1.equals(v2)) {
          notEqPoints.push(v1);
          break;
        }
      }
    }

    if (notEqPoints.length == 0) {
      return true;
    }

    for (var i = 0; i < notEqPoints.length; ++i) {
      var v = notEqPoints[i];
      if (!TCAD.utils.isPointInsidePolygon(v, p2)) {
        return false;
      }
    }

    return true;
  }

  function sortPaths(paths3D) {

    var transforms = TCAD.struct.hashTable.forVector3d();

    var paths = paths3D.map(function(path) {
      var tr = transforms.get(path.normal);
      if (tr === null) {
        var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(path.vertices, path.normal));
        var tr = _3dTransformation.invert();
        transforms.put(path.normal, tr);
      }

      return {
        vertices : path.vertices.map(function(v) {return tr.apply(v);}),
        normal : path.normal,
        shared : path.shared
      }
    });

    var index = [];
    for (var pi = 0; pi < paths.length; ++pi) {
      index[pi] = [];
      paths3D[pi].holes = [];
    }

    for (var pi = 0; pi < paths.length; ++pi) {
      var path = paths[pi];
      for (var piTest = 0; piTest < paths.length; ++piTest) {
        var pathTest = paths[piTest];
        if (piTest === pi) continue;
        if (pInP(pathTest.vertices, path.vertices)) {
          index[piTest].push(pi);
        }
      }
    }
    function collect(master, level) {
      var success = false;
      for (var i = 0; i < index.length; ++i) {
        var masters = index[i];
        if (level != masters.length) continue;
        for (var j = 0; j < masters.length; ++j) {
          var m = masters[j];
          if (m === master) {
            paths3D[m].holes.push(paths3D[i])
            success = true;
          }
        }
      }
      return success;
    }

    for (var success = true, level = 1;
         level < paths3D.length && success;
         level ++, success = false) {

      for (var i = 0; i < index.length; ++i) {
        var masters = index[i];
        if (masters.length == level - 1) {
          if (collect(i, level)) {
            success = true;
          }
        }
      }
    }

    function separate(path, separated) {
      separated.push(path);
      for (var i = 0; i < path.holes.length; ++i) {
        var hole = path.holes[i];
        for (var j = 0; j < hole.holes.length; ++j) {
          var inner = hole.holes[j];
          separate(inner, separated)
        }
      }
    }

    var separated = [];
    for (var i = 0; i < index.length; ++i) {
      var masters = index[i];
      if (masters.length == 0) {
        separate(paths3D[i], separated);
      }
    }
    return separated;
  }

  var byShared = {};
  for (var i = 0; i < cut.polygons.length; i++) {
    var p = cut.polygons[i];
    var tag = p.shared.getTag();
    if (byShared[tag] === undefined) byShared[tag] = [];
    byShared[tag].push(p);
  }
  var result = [];
  var allPoints = [];
  for (var tag in byShared) {
    var merged = TCAD.craft._mergeCSGPolygons(byShared[tag], allPoints);
    var sorted = sortPaths(merged);
    result.push.apply(result, sorted.map(function(path) {
        var p = new TCAD.Polygon(path.vertices, path.holes.map(function (path) {
          return path.vertices
        }), path.normal);
        if (path.shared !== undefined) {
          p.csgInfo = path.shared.csgInfo;
          p.__face = path.shared.face;
        }
        return p;
      })
    );
  }
  TCAD.craft.recoverySketchInfo(result);
  return result;
};

TCAD.craft.collectFaces = function(solids) {
  var faces = [];
  for (var i = 0; i < solids.length; i++) {
     TCAD.utils.addAll(faces, solids[i].polyFaces);
  }
  return faces;
};

TCAD.craft.collectCSGPolygons = function(faces) {
  var out = [];
  for (var fi = 0; fi < faces.length; fi++) {
    var face = faces[fi];
    TCAD.utils.addAll(out, face.csgGroup.toCSGPolygons());
  }
  return out;
};

TCAD.craft.toGroups = function(csgPolygons) {

  function vec(p) {
    var v = new TCAD.Vector();
    v.setV(p);
    return v;
  }

  var byShared = {};
  var infos = {};
  for (var i = 0; i < csgPolygons.length; i++) {
    var p = csgPolygons[i];
    var tag = p.shared.getTag();
    infos[tag] = p.shared;
    if (byShared[tag] === undefined) byShared[tag] = [];
    byShared[tag].push(p);
  }
  var result = [];
  for (var tag in byShared) {
    var groupedPolygons = byShared[tag];
    if (groupedPolygons.length === 0) continue;
    var plane = groupedPolygons[0].plane;
    var normal = vec(plane.normal);

    var simplePolygons = groupedPolygons.map(function (p) {

      var vertices = p.vertices.map(function (v) {
        return vec(v.pos);
      });
      return new TCAD.SimplePolygon(vertices, normal);
    });
    var csgGroup = new TCAD.CSGGroup(simplePolygons, normal, plane.w);
    var tcadShared = infos[tag].__tcad;
    if (tcadShared !== undefined) {
      csgGroup.csgInfo = tcadShared.csgInfo;
      csgGroup.__face = tcadShared.face;
    }
    result.push(csgGroup);
  }
  return result;
};

TCAD.craft.cut = function(app, request) {
  var face = request.face;
  var sketchedPolygons = TCAD.craft.getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var normal = TCAD.utils.vec(face.csgGroup.plane.normal);
  var cutter = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal, request.params.target, request.params.expansionFactor );
    cutter = cutter.concat(extruded);
  }
  var cutterCSG = CSG.fromPolygons(TCAD.craft._triangulateCSG(cutter));

  face.csgGroup.shared.__tcad.faceId += '$';
  var outSolids = [];
  for (var si = 0; si < request.solids.length; si++) {
    var work = request.solids[si].csg;
    var cut = work.subtract(cutterCSG);
    var solidMesh = TCAD.utils.createSolidMesh(cut);
    outSolids.push(solidMesh.geometry);
  }
  return outSolids;
};

TCAD.Craft = function(app) {
  this.app = app;
  this.history = [];
};

TCAD.Craft.prototype.current = function() {
  return this.history[this.history.length - 1];
};

TCAD.craft.detach = function(request) {
  var detachedConfig = {};
  for (var prop in request) {
    if (request.hasOwnProperty(prop)) {
      var value = request[prop];
      if (typeof(value) === 'object' && value.id !== undefined) {
        detachedConfig[prop] = value.id;
      } else {
        detachedConfig[prop] = value;
      }
    }
  }
  return detachedConfig
};

TCAD.Craft.prototype.modify = function(request) {

  var op = TCAD.craft.OPS[request.type];
  if (!op) return;

  var newSolids = op(this.app, request);

  if (newSolids == null) return;
  var i;
  for (i = 0; i < request.solids.length; i++) {
    request.solids[i].vanish();
  }
  for (i = 0; i < newSolids.length; i++) {
    this.app.viewer.workGroup.add(newSolids[i].meshObject);
  }
  this.history.push(TCAD.craft.detach(request));
  this.app.bus.notify('craft');

  this.app.viewer.render();
};

TCAD.craft.OPS = {
  CUT : TCAD.craft.cut,
  PAD : TCAD.craft.extrude,
  PLANE : function(app, request) {
    return [TCAD.utils.createPlane(request.params.basis, request.params.depth).geometry];
  },
  BOX : function(app, request) {
    return [TCAD.utils.createCSGBox(request.size).geometry];
  }
};
