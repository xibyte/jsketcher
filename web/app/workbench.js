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
        } else if (obj._class === 'TCAD.TWO.Circle') {
        }
      }
    }
  }
  return out;
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


TCAD.craft._pointOnLine = function(p, a, b) {
  
  var ab = a.minus(b);
  var ap = a.minus(p);
  
  var dp = ab.dot(ap);
  
  var abLength = ab.length();
  var apLength = ap.length();
  
  return apLength > 0 && apLength < abLength && TCAD.utils.equal(abLength * apLength, dp);
};

TCAD.craft._mergeCSGPolygons = function(__cgsPolygons) {
  var pointToPoly = {};
  var points = [];
  function pkey(point) {
    return point.x + ":" + point.y + ":" + point.z; 
  }
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
  
  function mergeVertices(__cgsPolygons) {
    var polygons = __cgsPolygons.map(function(cp) {
      return {
        vertices : cp.vertices.map(function(cv) {return roundV(vec(cv.pos))}),
        normal : roundV(vec(cp.plane.normal))
      };
    });
//    polygons = polygons.filter(function(e){return e.normal.equals(new TCAD.Vector(0,0,1)) });
    var points = [];
    var pointToPoly = {};
    for (var pi = 0; pi < polygons.length; ++pi) {
      var poly = polygons[pi];
      poly._id = pi;
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
      
      GONS:
      for (var pi = 0; pi < polygons.length; ++pi) {
        var poly = polygons[pi];
        var gons = pointToPoly[pkey(point)];
        var hasNormal = false;
        for (var gi = 0; gi < gons.length; gi++) {
          var pointPoly = gons[gi];
          if (poly._id === pointPoly._id) continue GONS;
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

  var triangles = triangulate(mergeVertices(__cgsPolygons));
//  return triangles;

  var pi, vi,  poly, key, vert;
  var pid = 0;
  for (pi = 0; pi < triangles.length; pi++) {
    poly = triangles[pi];
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

  function sharesEdge(key1, key2, normalKey) {
    var pp1 = pointToPoly[key1];
    var hit = 0;
    for (var ii = 0; ii < pp1.length; ii++) {
      var poly = pp1[ii];
      if (pkey(poly.normal) !== normalKey) {
        continue;        
      }
      for (var vi = 0; vi < poly.vertices.length; vi++) {
        if (pkey(poly.vertices[vi]) === key2 && hit++ > 0) {
          return true;
        }
      }
    }
    return false;
  }
  
  var paths = [];
  var path;
  var visited = {};
  function nextUnvisitedNormal(p, key) {
    var polygons = pointToPoly[key];
    for (var pi = 0; pi < polygons.length; pi++) {
      var poly = polygons[pi];
      var nkey = pnkey(p, poly.normal);
      if (visited[nkey] === undefined) return poly.normal;
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
    var normal = nextUnvisitedNormal(point, key);
    if (normal == null) {
      continue;
    }
    var normalKey = pkey(normal);

    pCurr = point;
    pStart = point;
    keyCurr = key;
    keyStart = key;
    
    path = [];
    keyPrev = null;

    visited[pnkey(pCurr, normal)] = true;
    while (pCurr != null) {
      console.log(pnkey(pCurr, normal));
      path.push(vec(pCurr));
      pCurr = null;
      var polygons = pointToPoly[keyCurr];
      POLY:
      for (pi = 0; pi < polygons.length; pi++) {
        poly = polygons[pi];
        if (normalKey != pkey(poly.normal)) continue;
        for (vi = 0; vi < poly.vertices.length; vi++) {
          p = poly.vertices[vi];
          key = pkey(p);
          
          if (keyStart === key) continue;
          if (keyCurr === key) continue;
          if (keyPrev != null && keyPrev === key) continue;
          var nkey = pnkey(p, poly.normal);
          if (sharesEdge(keyCurr, key, normalKey)) continue;
          if (visited[nkey] !== undefined) continue;
          visited[nkey] = true;

          pCurr = p;
          keyPrev = keyCurr;
          keyCurr = key;
          break POLY;
        }
      }
    }
    path = deleteRedundantPoints(path);
    if (path.length > 3) {
      paths.push({
        vertices : path,
        normal : normal
      });
    }
    console.log("-----")
  }

  return paths;
};

TCAD.craft._makeFromPolygons = function(polygons) {
  var points = [];
  var csgPolygons = [];
  var off = 0;
  for (var ei = 0; ei < polygons.length; ++ei) {
    var poly = polygons[ei];
    Array.prototype.push.apply( points, poly.shell );
    for ( var h = 0; h < poly.holes.length; h ++ ) {
      Array.prototype.push.apply( points, poly.holes[h] );
    }
    var shared = {group : poly};
    var refs = poly.triangulate();
    for ( var i = 0;  i < refs.length; ++ i ) {
      var a = refs[i][0] + off;
      var b = refs[i][1] + off;
      var c = refs[i][2] + off;
      var csgPoly = new CSG.Polygon([
        new CSG.Vertex(points[a], poly.normal),
        new CSG.Vertex(points[b], poly.normal),
        new CSG.Vertex(points[c], poly.normal)
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
  return TCAD.craft._mergeCSGPolygons(cut.polygons).map(function(path) {
    return new TCAD.Polygon(path.vertices, [], path.normal);
  });

  function sortPaths() {

  }


//    return cut.polygons.map(function(e) {
//      return new TCAD.Polygon(e.vertices.map(
//        function(v) {
//          return new TCAD.Vector(v.pos.x, v.pos.y, v.pos.z)
//        }), [])
//    });

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
  this.app.viewer.render();
};
