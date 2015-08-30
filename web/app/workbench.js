TCAD.workbench = {};

TCAD.workbench.SketchConnection = function(a, b, sketchObject) {
  this.a = a;
  this.b = b;
  this.sketchObject = sketchObject;
};

TCAD.workbench.readSketchGeom = function(sketch) {
  var out = {connections : []};
  var id = 0;
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].data.length; ++i) {
        var obj = sketch.layers[l].data[i];
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        var a = new TCAD.Vector(obj.points[0][1][1], obj.points[0][2][1], 0);
        var b = new TCAD.Vector(obj.points[1][1][1], obj.points[1][2][1], 0);
        if (obj._class === 'TCAD.TWO.Segment') {
          out.connections.push(new TCAD.workbench.SketchConnection(
              a, b, {_class : obj._class, id : id++}
            ));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          var center = new TCAD.Vector(obj.points[2][1][1], obj.points[2][2][1], 0);
          var approxArc = TCAD.workbench.approxArc(a, b, center, 20);
          var data =  {_class : obj._class, id : id++};
          for (var j = 0; j < approxArc.length - 1; j++) {
            var pa = approxArc[j];
            var pb = approxArc[j+1];
            out.connections.push(new TCAD.workbench.SketchConnection(
              pa, pb, data
            ));
          }

        } else if (obj._class === 'TCAD.TWO.Circle') {
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

TCAD.workbench.applyHistory = function(history) {

  for (var hi = 0; hi < history.length; ++hi) {
    var mod = history[hi];
    switch (mod.operation) {
    }

  }
};

TCAD.workbench.Cut = function() {

  this.depth = null;

  this.load = function(data) {
    this.depth = data.depth;
  };

  this.save = function() {
    return {
      depth : this.depth
    };
  };

  this.apply = function(app, face, faces) {
    TCAD.craft.cut(app, face, faces, this.depth);
  };
};

TCAD.workbench.Cut.prototype.TYPE = 'CUT';


TCAD.craft = {};

TCAD.craft.getSketchedPolygons3D = function(app, face) {

  var savedFace = localStorage.getItem(app.faceStorageKey(face.id));
  if (savedFace == null) return null;

  var geom = TCAD.workbench.readSketchGeom(JSON.parse(savedFace));
  var polygons2D = TCAD.utils.sketchToPolygons(geom);

  var normal = face.polygon.normal;
  var depth = null;
  var sketchedPolygons = [];
  for (var i = 0; i < polygons2D.length; i++) {
    var poly2D = polygons2D[i];
    if (poly2D.shell.length < 3) continue;

    if (depth == null) {
      var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(face.polygon.shell, normal));
      //we lost depth or z off in 2d sketch, calculate it again
      depth = normal.dot(face.polygon.shell[0]);
    }

    var shell = [];
    for (var m = 0; m < poly2D.shell.length; ++m) {
      var vec = poly2D.shell[m];
      vec.z = depth;
//      var a = _3dTransformation.apply(new TCAD.Vector(poly2D[m][0], poly2D[m][1], depth));
      var a = _3dTransformation.apply(vec);
      a.sketchConnectionObject = vec.sketchConnectionObject;
      shell.push(a);
    }
    var polygon = new TCAD.Polygon(shell);
    sketchedPolygons.push(polygon);
  }
  return sketchedPolygons;
};

TCAD.craft.extrude = function(app, face, faces, height) {

  var sketchedPolygons = TCAD.craft.getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var newSolidFaces = [];
  var normal = face.polygon.normal;
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal.multiply(height));
    newSolidFaces = newSolidFaces.concat(extruded);
  }

  face.polygon.__face = undefined;

  for (var i = 0; i < faces.length; i++) {
    newSolidFaces.push(faces[i].polygon);
  }
  return newSolidFaces;
};


TCAD.craft.pkey = function(point) {
  return point.x + ":" + point.y + ":" + point.z;
}

TCAD.craft._pointOnLine = function(p, a, b) {
  
  var ab = a.minus(b);
  var ap = a.minus(p);
  
  var dp = ab.dot(ap);
  
  var abLength = ab.length();
  var apLength = ap.length();
  
  return apLength > 0 && apLength < abLength && TCAD.utils.equal(abLength * apLength, dp);
};

TCAD.craft._mergeCSGPolygonsTest = function() {

  function cppol(points) {
    return {
      vertices : points.map(function(e) {
        return new TCAD.Vector(e[0], e[1], 0);
      }),
      normal : new TCAD.Vector(0,0,1) 
    }
    
  }
  var paths = TCAD.craft._mergeCSGPolygons(
      [
        cppol([0,0], [50,0], [50,10], [0,10]),
        cppol([0,10], [50,10], [50,60], [0,60]),
        cppol([0,60], [50,60], [50,100], [0,100])
      ]
  );
  console.log(paths);
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
        csgInfo : cp.shared.__tcad,
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
          b.setV(a);
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
          b.normal.setV(a.normal);
        }
        if (TCAD.utils.areEqual(a.w, b.w, tol)) {
          b.w = a.w;
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
        csgInfo : csgData.csgInfo
      });
    }
  }

  return filteredPaths;
};



TCAD.craft._mergeCSGPolygonsTest0 = function(data) {
  TCAD.craft._mergeCSGPolygonsTester(
      [
        [[0,0], [50,0], [50,10], [0,10]],
        [[0,10], [50,10], [50,60], [0,60]],
        [[0,60], [50,60], [50,100], [0,100]]
      ]
  );
};

TCAD.craft._mergeCSGPolygonsTest1 = function(data) {
  TCAD.craft._mergeCSGPolygonsTester(
      [
        [[0,0], [50,0], [50,10], [0,10]],
        [[0,10], [20,10], [20,60], [0,60]],
        [[20,10], [30,10], [30,60], [20,60]],
        [[40,10], [50,10], [50,60], [40,60]],
        [[0,60], [50,60], [50,100], [0,100]]
      ]
  );
};

TCAD.craft._mergeCSGPolygonsTest2 = function(data) {
  TCAD.craft._mergeCSGPolygonsTester(
      [
        [[0,0], [25,0], [50,0], [50,10], [0,10]],
        [[0,10], [20,10], [20,60], [0,60]],
        [[20,10], [30,10], [30,60], [20,60]],
        [[40,10], [50,10], [50,60], [40,60]],
        [[0,60], [50,60], [50,100], [0,100]]
      ]
  );
};

TCAD.craft._mergeCSGPolygonsTester = function(data) {

  function cppol(points) {
    return {
      vertices : points.map(function(e) {
        return {pos: new TCAD.Vector(e[0], e[1], 0)};
      }),
      plane: {normal : new TCAD.Vector(0,0,1), w : 0}

    }

  }
  var paths = TCAD.craft._mergeCSGPolygons(data.map(function(p) {
    return cppol(p);
  }));
};

TCAD.craft._makeFromPolygons = function(polygons) {
  function csgVec(v) {
    return new CSG.Vector3D(v.x, v.y, v.z);
  }
  var points = [];
  var csgPolygons = [];
  var off = 0;
  for (var ei = 0; ei < polygons.length; ++ei) {
    var poly = polygons[ei];
    Array.prototype.push.apply( points, poly.shell );
    for ( var h = 0; h < poly.holes.length; h ++ ) {
      Array.prototype.push.apply( points, poly.holes[h] );
    }
    var pid = poly.id;
    var shared = new CSG.Polygon.Shared([pid, pid, pid, pid]);
    shared.__tcad = poly.csgInfo;
    var refs = poly.triangulate();
    for ( var i = 0;  i < refs.length; ++ i ) {
      var a = refs[i][0] + off;
      var b = refs[i][1] + off;
      var c = refs[i][2] + off;
      if (points[b].minus(points[a]).cross(points[c].minus(points[a])).length() === 0)  {
        continue;
      }
      var csgPoly = new CSG.Polygon([
        new CSG.Vertex(csgVec(points[a]), csgVec(poly.normal)),
        new CSG.Vertex(csgVec(points[b]), csgVec(poly.normal)),
        new CSG.Vertex(csgVec(points[c]), csgVec(poly.normal))
      ], shared);
      csgPolygons.push(csgPoly);
    }
    off = points.length;
  }
  return csgPolygons;
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

TCAD.craft.cut = function(app, face, faces, height) {

  var sketchedPolygons = TCAD.craft.getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var newSolidFaces = [];
  var normal = face.polygon.normal;

  var cutter = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal.multiply( - height));
    cutter = cutter.concat(TCAD.craft._makeFromPolygons(extruded));
  }
  var work = TCAD.craft._makeFromPolygons(faces.map(function(f){ return f.polygon }));

  var cut = CSG.fromPolygons(work).subtract(CSG.fromPolygons(cutter));

  face.polygon.__face = undefined;

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
        csgInfo : path.csgInfo
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
        p.csgInfo = path.csgInfo;
        return p;
      })
    );
  }
  TCAD.craft.recoverySketchInfo(result);

  return result;
};

TCAD.Craft = function(app) {
  this.app = app; 
  this.history = []; 
};

TCAD.Craft.prototype.current = function() {
  return this.history[this.history.length - 1];
};
  
TCAD.Craft.prototype.modify = function(solid, modification) {
  var faces = modification();
  if (faces == null) return;
  this.app.viewer.scene.remove( solid.meshObject );
  this.app.viewer.scene.add(TCAD.utils.createSolidMesh(faces));

  //REMOVE IT
  this.app._refreshSketches();

  this.app.viewer.render();
};
