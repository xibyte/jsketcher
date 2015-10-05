TCAD.workbench = {};

TCAD.workbench.SketchConnection = function(a, b, sketchObject) {
  this.a = a;
  this.b = b;
  this.sketchObject = sketchObject;
};

TCAD.workbench.readSketchGeom = function(sketch) {
  var out = {connections : [], loops : []};
  var id = 0;
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].data.length; ++i) {
        var obj = sketch.layers[l].data[i];
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          var a = new TCAD.Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          var b = new TCAD.Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          out.connections.push(new TCAD.workbench.SketchConnection(a, b, {_class : obj._class, id : id++}));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          var a = new TCAD.Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
          var b = new TCAD.Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
          var center = new TCAD.Vector(obj.points[2][1][1], obj.points[2][2][1], 0);
          var approxArc = TCAD.workbench.approxArc(a, b, center, 20);
          var data =  {_class : obj._class, id : id++};
          for (var j = 0; j < approxArc.length - 1; j++) {
            out.connections.push(new TCAD.workbench.SketchConnection(approxArc[j], approxArc[j+1], data));
          }
        } else if (obj._class === 'TCAD.TWO.Circle') {
          var center = new TCAD.Vector(obj.c[1][1], obj.c[2][1], 0);
          var approxCircle = TCAD.workbench.approxCircle(center, obj.r, 20);
          var data =  {_class : obj._class, id : id++};
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

TCAD.workbench.approxArc = function(ao, bo, c, k) {
  var a = ao.minus(c);
  var b = bo.minus(c);
  var points = [ao];
  var abAngle = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  if (abAngle > Math.PI * 2) abAngle = Math.PI / 2 - abAngle;
  if (abAngle < 0) abAngle = Math.PI * 2 + abAngle;

  var r = a.length();
  var step =  abAngle / k;
  var angle = Math.atan2(a.y, a.x) + step;

  for (var i = 0; i < k - 2; ++i) {
    points.push(new TCAD.Vector(c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)));
    angle += step;
  }
  points.push(bo);
  return points;
};

TCAD.workbench.approxCircle = function(c, r, k) {
  var points = [];
  var step =  (2 * Math.PI) / k;

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

  var meld = request.solids[0].csg.union(CSG.fromPolygons(TCAD.craft._triangulateCSG(toMeldWith)));

  face.csgGroup.shared.__tcad.faceId += '$';
  return [TCAD.utils.createSolidMesh(meld).geometry];
};

TCAD.craft._pointOnLine = function(p, a, b) {
  
  var ab = a.minus(b);
  var ap = a.minus(p);
  
  var dp = ab.dot(ap);

  var abLength = ab.length();
  var apLength = ap.length();

  return apLength > 0 && apLength < abLength && TCAD.utils.areEqual(abLength * apLength, dp, 1E-20);
};

TCAD.craft.reconstructSketchBounds = function(csg, face) {

  var polygons = csg.toPolygons();
  var plane = face.csgGroup.plane;
  var sketchSegments = [];
  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    if (TCAD.utils.equal(poly.plane.normal.dot(plane.normal), 1)) {
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
        sketchSegments.push([a.pos, b.pos, poly]);
      }
    }
  }
  return TCAD.craft.segmentsToPaths(sketchSegments);
};

TCAD.craft.deleteRedundantPoints = function(path) {
  var cleanedPath = [];
  //Delete redundant point
  var pathLength = path.length;
  for (var pi = 0; pi < pathLength; pi++) {
    var bIdx = ((pi + 1) % pathLength);
    var a = path[pi];
    var b = path[bIdx];
    var c = path[(pi + 2) % pathLength];
    var eq = TCAD.utils.equal;
    if (!eq(a.minus(b).unit().dot(a.minus(c).unit()), 1)) {
      cleanedPath.push(b);
      for (var ii = 0; ii < pathLength - pi - 1; ++ii) {
        a = path[(ii + bIdx) % pathLength];
        b = path[(ii + bIdx + 1) % pathLength];
        c = path[(ii + bIdx + 2) % pathLength];
        if (!eq(a.minus(b).unit().dot(a.minus(c).unit()), 1)) {
          cleanedPath.push(b);
        }
      }
      break;
    }
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
      var edge = edges[i]
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

TCAD.craft._mergeCSGPolygons = function (__cgsPolygons, allPoints) {

  function vec(p) {
    var v = new TCAD.Vector();
    v.setV(p);
    return v;
  }

//  var tol = Math.round(1 / TCAD.TOLERANCE);
  var tol = 1E6;

  function prepare(__cgsPolygons) {
    var counter = 0;
    var polygons = __cgsPolygons.map(function (cp) {
      if (cp.plane.___ID === undefined) {
        cp.plane.___ID = ++counter;
      }
      return {
        vertices: cp.vertices.map(function (cv) {
          return vec(cv.pos)
        }),
        shared : cp.shared.__tcad,
        normal: vec(cp.plane.normal),
        w: cp.plane.w
      };
    });

    var points = [];

    for (var pi = 0; pi < polygons.length; ++pi) {
      var poly = polygons[pi];
      for (var vi = 0; vi < poly.vertices.length; ++vi) {
        var vert = poly.vertices[vi];
        points.push(vert);
        allPoints.push(vert);
      }
    }

    var tol = 1E-6;
    for (var i = 0; i < allPoints.length; i++) {
      var a = allPoints[i];
      for (var j = i + 1; j < points.length; j++) {
        var b = points[j];
        if (
          TCAD.utils.areEqual(a.x, b.x, tol) &&
          TCAD.utils.areEqual(a.y, b.y, tol) &&
          TCAD.utils.areEqual(a.z, b.z, tol)
        ) {
          //b.setV(a);
        }
      }
    }
    for (var i = 0; i < polygons.length; i++) {
      var a = polygons[i];
      for (var j = i + 1; j < polygons.length; j++) {
        var b = polygons[j];
        if (
          TCAD.utils.areEqual(a.normal.x, b.normal.x, tol) &&
          TCAD.utils.areEqual(a.normal.y, b.normal.y, tol) &&
          TCAD.utils.areEqual(a.normal.z, b.normal.z, tol)
        ) {
          //b.normal.setV(a.normal);
        }
        if (TCAD.utils.areEqual(a.w, b.w, tol)) {
          //b.w = a.w;
        }
      }
    }
    return polygons;
  }
  
  function mergeVertices(polygons) {
    var points = [];
    var pointToPoly = TCAD.struct.hashTable.forVector3d();
    for (var pi = 0; pi < polygons.length; ++pi) {
      var poly = polygons[pi];
      poly.id = pi;
      for (var vi = 0; vi < poly.vertices.length; ++vi) {
        var vert = poly.vertices[vi];
        var pList = pointToPoly.get(vert);
        if (pList === null) {
          pointToPoly.put(vert, [poly]);
          points.push(vert);
        } else {
          pList.push(poly);
        }
      }
    }

    
    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      
      var gons = pointToPoly.get(point);
      
      POLYGONS:
      for (var pi = 0; pi < polygons.length; ++pi) {
        var poly = polygons[pi];
        var hasNormal = false;
        for (var gi = 0; gi < gons.length; gi++) {
          var pointPoly = gons[gi];
          if (poly.id === pointPoly.id) continue POLYGONS;
        }

        var n = poly.vertices.length;

        var add = [];
        for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
          var a = poly.vertices[ p ];
          var b = poly.vertices[ q ];
          if (TCAD.craft._pointOnLine(point, a, b)) {
            add[q] = point;
          }
        }
        if (add.length != 0) {
          var newPath = [];
          for (var j = 0; j < poly.vertices.length; j++) {
            if (add[j] !== undefined) {
              newPath.push(add[j]);
            }
            newPath.push(poly.vertices[j]);
          }
          poly.vertices = newPath;
        }
      }
    }
    return polygons;
  }
  
  var polygons = prepare(__cgsPolygons);
  polygons = mergeVertices(polygons);
  //return polygons;


  function deleteRedundantPoints(path) {
    var n = path.length;
    if (n < 3) return path;
    var remove = [];
    var pp = null;
    for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
      if (pp != null) {
        var a = path[ pp ];
        var b = path[ p ];
        var c = path[ q ];
        if (TCAD.craft._pointOnLine(b, a, c)) {
          remove[p] = b;
        }
      }
      pp = p;
    }
    if (remove.length != 0) {
      var newPath = [];
      for (var j = 0; j < n; j++) {
        if (remove[j] === undefined) {
          newPath.push(path[j]);
        }
      }
      path = newPath;
    }
    return path;
  }

  var edges = TCAD.struct.hashTable.forEdge();

  for (var pi = 0; pi < polygons.length; pi++) {
    var poly = polygons[pi];
    var n = poly.vertices.length, p, q;
    for (p = n - 1, q = 0; q < n; p = q ++) {
      var a = poly.vertices[p];
      var b = poly.vertices[q];

      var edge = [a, b, poly];
      var shares = edges.get(edge);
      if (shares === null) {
        shares = 0;
      }
      edges.put(edge, shares + 1);
    }
  }

  var veq = TCAD.struct.hashTable.vectorEquals;

  var paths = [];
  var csgDatas = [];
  var index = TCAD.struct.hashTable.forVector3d();

  function indexPoint(p, edge) {
    var edges = index.get(p);
    if (edges === null) {
      edges = [];
      index.put(p, edges);
    }
    edges.push(edge);
  }

  var edgesToProcess = [];
  edges.entries(function(k, v) {
    if (v === 1) {
      indexPoint(k[0], k);
      indexPoint(k[1], k);
      k[3] = false;
      edgesToProcess.push(k);
    }
  });

  function nextPoint(p) {
    var edges = index.get(p);
    if (edges === null) return null;
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i]
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

  for (var ei = 0; ei < edgesToProcess.length; ei++) {
    var edge = edgesToProcess[ei];
    if (edge[3]) {
      continue;
    }
    edge[3] = true;
    var path = [edge[0], edge[1]];
    paths.push(path);
    csgDatas.push(edge[2]);
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
    var path = deleteRedundantPoints(paths[i]);
    var csgData = csgDatas[i];
    if (path.length > 2) {
      filteredPaths.push({
        vertices : path,
        normal : csgData.normal,
        w : csgData.w,
        shared : csgData.shared
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
      if (points[b].pos.minus(points[a].pos).cross(points[c].pos.minus(points[a].pos)).length() === 0)  {
        continue;
      }
      var csgPoly = new CSG.Polygon([points[a], points[b], points[c]], poly.shared, poly.plane);
      triangled.push(csgPoly);
    }
  }
  return triangled;
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

  var detachedRequest = TCAD.craft.detach(request);
  var newSolids = op(this.app, request);

  if (newSolids == null) return;
  var i;
  for (i = 0; i < request.solids.length; i++) {
    this.app.viewer.scene.remove( request.solids[i].meshObject );
  }
  for (i = 0; i < newSolids.length; i++) {
    this.app.viewer.scene.add(newSolids[i].meshObject);
  }
  this.history.push(detachedRequest);
  this.app.bus.notify('craft');

  this.app.viewer.render();
};

TCAD.craft.OPS = {
  CUT : TCAD.craft.cut,
  PAD : TCAD.craft.extrude,
  BOX : function(app, request) {
    return [TCAD.utils.createCSGBox(request.size).geometry];
  }
};
