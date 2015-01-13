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


TCAD.craft._mergeCSGPolygons = function(cgsPolygons) {
  var pointToPoly = {};
  var points = [];
  function pkey(point) {
    return point.x + ":" + point.y + ":" + point.z; 
  }
  function pnkey(point, normal) {
    return pkey(point) + ":" + pkey(normal);
  }
  var pi, vi,  poly, key, vert;
  var pid = 0;
  for (pi = 0; pi < cgsPolygons.length; pi++) {
    poly = cgsPolygons[pi];
    poly.__tcad_id = pi;
    for (vi = 0; vi < poly.vertices.length; vi++) {
      vert = poly.vertices[vi];
      key = pkey(vert.pos);
      points.push(vert.pos);
      var pList = pointToPoly[key];
      if (pList === undefined) {
        pointToPoly[key] = [poly];
      } else {
        pList.push(poly);
      }
    }
  }

  function sharesEdge(key1, key2, normalKey) {
    var pp1 = pointToPoly[key1];
    for (var ii = 0; ii < pp1.length; ii++) {
      var poly = pp1[ii];
      if (pkey(poly.plane.normal) === normalKey) {
        continue;        
      }
      for (var vi = 0; vi < poly.vertices.length; vi++) {
        if (pkey(poly.vertices[vi].pos) === key2 && ii === 1) {
          return true;
        }
      }
    }
    return false;
  }
  
  function vec(p) {
    var v = new TCAD.Vector();
    v.setV(p);
    return v;   
  }
  
  var paths = [];
  var path;
  var visited = {};
  function nextUnvisitedNormal(p, key) {
    var polygons = pointToPoly[key];
    for (var pi = 0; pi < polygons.length; pi++) {
      var poly = polygons[pi];
      var nkey = pnkey(p, poly.plane.normal);
      if (visited[nkey] === undefined) return poly.plane.normal;
    }
    return null;
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
      path.push(vec(pCurr));
      pCurr = null;
      var polygons = pointToPoly[keyCurr];
      POLY:
      for (pi = 0; pi < polygons.length; pi++) {
        poly = polygons[pi];
        for (vi = 0; vi < poly.vertices.length; vi++) {
          p = poly.vertices[vi].pos;
          key = pkey(p);
          
          if (keyStart === key) continue;
          if (keyCurr === key) continue;
          if (keyPrev != null && keyPrev === key) continue;
          var nkey = pnkey(p, poly.plane.normal);
                  console.log(nkey);
          if (visited[nkey] !== undefined) continue;
          visited[nkey] = true;

          if (sharesEdge(keyCurr, key, normalKey)) continue;
          pCurr = p;
          keyPrev = keyCurr;
          keyCurr = key;
          break POLY;
        }
      }
    }
    if (path.length > 3) {
      paths.push(path);
    }
  }
  
  function sortPaths() {
    
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
//  return TCAD.craft._mergeCSGPolygons(cut.polygons).map(function(path) {
//    return new TCAD.Polygon(path, []);
//  });

    return cut.polygons.map(function(e) {
      return new TCAD.Polygon(e.vertices.map(
        function(v) {
          return new TCAD.Vector(v.pos.x, v.pos.y, v.pos.z)
        }), [])
    });

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
