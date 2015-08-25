TCAD.workbench = {};

TCAD.workbench.readSketchGeom = function(sketch) {
  var out = {lines : [], circles : [], arcs : []};
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].data.length; ++i) {
        var obj = sketch.layers[l].data[i];
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          out.lines.push([
            obj.points[0][1][1], obj.points[0][2][1], //x,y
            obj.points[1][1][1], obj.points[1][2][1]  //x,y
          ]);
        } else if (obj._class === 'TCAD.TWO.Arc') {
          out.lines.push.apply(out.lines, TCAD.workbench.integrate(
            [obj.points[0][1][1], obj.points[0][2][1]],
            [obj.points[1][1][1], obj.points[1][2][1]],
            [obj.points[2][1][1], obj.points[2][2][1]],
            20
          ));
        } else if (obj._class === 'TCAD.TWO.Circle') {
        }
      }
    }
  }
  return out;
};

TCAD.workbench.integrate = function(_a, _b, _c, k) {
  var ao = new TCAD.Vector(_a[0], _a[1], 0);
  var bo = new TCAD.Vector(_b[0], _b[1], 0);
  var c = new TCAD.Vector(_c[0], _c[1], 0);
  var a = ao.minus(c);
  var b = bo.minus(c);
  var points = [[ao.x, ao.y]];
  var abAngle = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  if (abAngle > Math.PI * 2) abAngle = Math.PI / 2 - abAngle;
  if (abAngle < 0) abAngle = Math.PI * 2 + abAngle;

  var r = a.length();
  var step =  abAngle / k;
  var angle = Math.atan2(a.y, a.x) + step;

  for (var i = 0; i < k - 2; ++i) {
    points.push([c.x + r*Math.cos(angle), c.y + r*Math.sin(angle)]);
    angle += step;
  }
  points.push([bo.x, bo.y]);
  var lines = [];
  for (var i = 0; i < points.length - 1; i++) {
    var p1 = points[i];
    var p2 = points[i + 1];
    lines.push([p1[0], p1[1], p2[0], p2[1]]);
  }
  return lines;
};

TCAD.workbench.serializeSolid = function(solid) {
  data = {};
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
      shell.push(a)
    }
    sketchedPolygons.push(new TCAD.Polygon(shell));
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

TCAD.craft._mergeCSGPolygons = function(__cgsPolygons) {
  var pointToPoly = {};
  var points = [];
  var pkey = TCAD.craft.pkey;

  function pnkey(point, normal) {
    return pkey(point) + ":" + pkey(normal);
  }
  function vec(p) {
    var v = new TCAD.Vector();
    v.setV(p);
    return v;
  }

//  var tol = Math.round(1 / TCAD.TOLERANCE);
  var tol = 1E6;
  function round(num) {
    return Math.round(num * tol) / tol;
  }
  function roundV(v) {
    return v.set(round(v.x), round(v.y), round(v.z));
  }

  function prepare(__cgsPolygons) {
    var counter = 0;
    var polygons = __cgsPolygons.map(function(cp) {
      if (cp.plane.___ID === undefined) {
        cp.plane.___ID = ++ counter;
      }
      return {
        vertices : cp.vertices.map(function(cv) {return vec(cv.pos)}),
        normal : vec(cp.plane.normal),
        w : cp.plane.w
      };
    });

    var points = [];

                 for (var pi = 0; pi < polygons.length; ++pi) {
                   var poly = polygons[pi];
                   for (var vi = 0; vi < poly.vertices.length; ++vi) {
                     var vert = poly.vertices[vi];
                     points.push(vert);
                   }
                 }

        var tol = 1E-6;
        for (var i = 0; i < points.length; i++) {
          var a = points[i];
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

//        for (var i = 0; i < points.length; i++) {
//          roundV(points[i]);
//        }

        for (var i = 0; i < points.length; i++) {
//          console.log(points[i]);
        }



    //polygons = polygons.filter(function(e){return e.normal.equals(new TCAD.Vector(-1,0,0)) });
    return polygons;
  }
  
  function mergeVertices(polygons) {
    var points = [];
    var pointToPoly = {};
    for (var pi = 0; pi < polygons.length; ++pi) {
      var poly = polygons[pi];
      poly.id = pi;
      for (var vi = 0; vi < poly.vertices.length; ++vi) {
        var vert = poly.vertices[vi];
        var key = pkey(vert);
        var pList = pointToPoly[key];
        if (pList === undefined) {
          pointToPoly[key] = [poly];
          points.push(vert);
        } else {
          pList.push(poly);
        }
      }
    }

    
    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      
      var gons = pointToPoly[pkey(point)];
      
      POLYGONS:
      for (var pi = 0; pi < polygons.length; ++pi) {
        var poly = polygons[pi];
        var hasNormal = false;
        for (var gi = 0; gi < gons.length; gi++) {
          var pointPoly = gons[gi];
          if (poly.id === pointPoly.id) continue POLYGONS;
          if (pointPoly.normal.equals(poly.normal)) {
            hasNormal = true;  
          }
        }
        if (!hasNormal) continue;
        
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
  
  function triangulate(polygons) {
    var triangles = [];
    for (var ei = 0; ei < polygons.length; ++ei) {
      var poly = polygons[ei];
      var nvec = poly.normal;
      var refs = new TCAD.Polygon(poly.vertices, [], nvec).triangulate();
      for ( var i = 0;  i < refs.length; ++ i ) {
        var a = refs[i][0];
        var b = refs[i][1];
        var c = refs[i][2];
        var triangle = {
          vertices : [
            poly.vertices[a],
            poly.vertices[b],
            poly.vertices[c]
          ],
          normal : poly.normal
        };
        triangles.push(triangle);
      }
    }
    return triangles;
  }

  var polygons = prepare(__cgsPolygons);
  polygons = mergeVertices(polygons);
  //polygons = triangulate(polygons);
//  return polygons;

  var pi, vi,  poly, key, vert;
  var pid = 0;
  for (pi = 0; pi < polygons.length; pi++) {
    poly = polygons[pi];
    poly.id = pi;
    for (vi = 0; vi < poly.vertices.length; vi++) {
      vert = poly.vertices[vi];
      key = pkey(vert);
      var pList = pointToPoly[key];
      if (pList === undefined) {
        pointToPoly[key] = [poly];
        points.push(vert);
      } else {
        pList.push(poly);
      }
    }
  }

  function getNeighbors(vertices, i) {
    var a = i - 1;
    var b = i + 1;
    if (a < 0) a = vertices.length - 1;      
    if (b == vertices.length) b = 0;
    return [a, b];
  }
  
  function pointIdx(vertices, key) {
    for (var i = 0; i < vertices.length; i++) {
      var v = vertices[i];
      if (pkey(v) === key) {
        return i;
      }
    }
    return -1;
  }
  
  function getDirs(vertices, key) {
    var idx = pointIdx(vertices, key);
    if  (idx != -1) {
      return getNeighbors(vertices, idx).map(function(i) { return vertices[i]; });
    }
    return null;
  }
  
  function sharesEdge(masterPolyId, v1, v2, key1, key2, normalKey) {
    var e1 = v2.minus(v1).normalize();
    var pp1 = pointToPoly[key1];
    function along(v) {
      var e = v.minus(v1).normalize();
      return e.equals(e1);
    }
    for (var ii = 0; ii < pp1.length; ii++) {
      var poly = pp1[ii];
      if (pkey(poly.normal) !== normalKey) {
        continue;        
      }
      if (masterPolyId === poly.id) continue;
      var idx = pointIdx(poly.vertices, key1);
      if (idx != -1) {
        var neighbors = getNeighbors(poly.vertices, idx);
        if (along(poly.vertices[neighbors[0]]) || 
            along(poly.vertices[neighbors[1]])) {
          return true;
        }
      }
    }
    return false;
  }
  
  var paths = [];
  var path;
  var visited = {};
  function nextUnvisitedPolygon(p, key) {
    var polygons = pointToPoly[key];
    for (var pi = 0; pi < polygons.length; pi++) {
      var poly = polygons[pi];
      var nkey = pnkey(p, poly.normal);
      if (visited[nkey] === undefined) return poly;
    }
    return null;
  }
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

  var p, pCurr, keyCurr, keyPrev, keyStart, pStart;
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    key = pkey(point);
    var unvPoly = nextUnvisitedPolygon(point, key);
    if (unvPoly == null) {
      continue;
    }
    var normal = unvPoly.normal;
    var w = unvPoly.w;
    var normalKey = pkey(normal);

    pCurr = point;
    pStart = point;
    keyCurr = key;
    keyStart = key;
    
    path = [];
    keyPrev = null;

    visited[pnkey(pCurr, normal)] = true;
    var foundNext = true;
    while (foundNext) {
      foundNext = false;
      console.log(pnkey(pCurr, normal));
      path.push(vec(pCurr));
      var gons = pointToPoly[keyCurr];
      POLY:
      for (pi = 0; pi < gons.length; pi++) {
        poly = gons[pi];
        if (normalKey != pkey(poly.normal)) continue;
        var dirs = getDirs(poly.vertices, keyCurr);
        if (dirs == null) continue;
        for (vi = 0; vi < dirs.length; vi++) {
          p = dirs[vi];
          key = pkey(p);
          
          if (keyStart === key) continue;
          if (keyCurr === key) continue;
          if (keyPrev != null && keyPrev === key) continue;
          var nkey = pnkey(p, poly.normal);
          if (sharesEdge(poly.id, pCurr, p, keyCurr, key, normalKey)) continue;
          if (visited[nkey] !== undefined) continue;
          visited[nkey] = true;

          pCurr = p;
          keyPrev = keyCurr;
          keyCurr = key;
          foundNext = true;
          break POLY;
        }
      }
    }
    path = deleteRedundantPoints(path);
    if (path.length > 2) {
      paths.push({
        vertices : path,
        normal : normal,
        w : w
      });
    }
    console.log("-----")
  }

  return paths;
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

  console.log("<><><><><><><><><><><><><><><><><><>");
  paths.map(function(p) {
    p.vertices.map(function(v){
      console.log(v.x + ":" + v.y);
    });
    console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
  })
  
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
    var refs = poly.triangulate();
    for ( var i = 0;  i < refs.length; ++ i ) {
      var a = refs[i][0] + off;
      var b = refs[i][1] + off;
      var c = refs[i][2] + off;
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

    var transforms = {};

    var paths = paths3D.map(function(path) {

      var nkey = TCAD.craft.pkey(path.normal);
      var tr = transforms[nkey];
      if (tr === undefined) {
        var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(path.vertices, path.normal));
        var tr = _3dTransformation.invert();
        transforms[nkey] = tr;
      }

      return {
        vertices : path.vertices.map(function(v) {return tr.apply(v);}),
        normal : path.normal,
        w : path.w
      }
    });

    var index = [];
    for (var pi = 0; pi < paths.length; ++pi) {
      index[pi] = [];
      paths3D[pi].holes = [];
    }

    for (var pi = 0; pi < paths.length; ++pi) {
      var path = paths[pi];
//      var depth = paths3D[pi].vertices[0].dot(paths3D[pi].normal);
      for (var piTest = 0; piTest < paths.length; ++piTest) {
        var pathTest = paths[piTest];
        if (piTest === pi) continue;
        if (!pathTest.normal.equals(path.normal)) continue;
//        var depthTest = paths3D[piTest].vertices[0].dot(paths3D[piTest].normal);
//        if (!TCAD.utils.equal(depthTest, depth)) continue;
        if (!TCAD.utils.areEqual(path.w, pathTest.w, 10E-6)) continue;

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
  for (var tag in byShared) {
    var merged = TCAD.craft._mergeCSGPolygons(byShared[tag]);
    var sorted = sortPaths(merged);
    result.push.apply(result, sorted.map(function(path) {
        return new TCAD.Polygon(path.vertices, path.holes.map(function(path){return path.vertices}), path.normal);
      })
    );

  }
  console.log(result);
  return result;


    //return byShared[20].map(function(e) {
    //  return new TCAD.Polygon(e.vertices.map(
    //    function(v) {
    //      return new TCAD.Vector(v.pos.x, v.pos.y, v.pos.z)
    //    }), [])
    //});

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
