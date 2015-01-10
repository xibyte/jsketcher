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
    return out;
  }
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
}

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
    newSolidFaces = newSolidFaces.concat(newSolidFaces, extruded);
  }

  face.polygon.__face = undefined;

  for (var i = 0; i < faces.length; i++) {
    newSolidFaces.push(faces[i].polygon);
  }
  return newSolidFaces;
};


TCAD.craft.cut = function(app, face, faces, height) {

  var sketchedPolygons = TCAD.craft.getSketchedPolygons3D(app, face);
  if (sketchedPolygons == null) return null;

  var newSolidFaces = [];
  var normal = face.polygon.normal;
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal.multiply(height));
    newSolidFaces = newSolidFaces.concat(newSolidFaces, extruded);
  }

  face.polygon.__face = undefined;

  for (var i = 0; i < faces.length; i++) {
    newSolidFaces.push(faces[i].polygon);
  }
  return newSolidFaces;
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
  this.app.viewer.scene.add( TCAD.utils.createSolidMesh(faces) );
  this.app.viewer.render();
};
