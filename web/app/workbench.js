TCAD.workbench = {};

TCAD.workbench.readSketchGeom = function(sketch) {
  var out = {lines : [], circles : [], arcs : []};
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].length; ++i) {
        var obj = sketch.layers[l][i];
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

TCAD.craft = {};

TCAD.craft.extrude = function(app, face, height) {

  var savedFace = localStorage.getItem(app.faceStorageKey(face.id));
  if (savedFace == null) return;
  
  var geom = TCAD.workbench.readSketchGeom(JSON.parse(savedFace));
  var polygons2D = TCAD.utils.sketchToPolygons(geom);
  var solid = face.solid;

  var normal = face.polygon.normal;
  var depth = null;
  var sketchedPolygons = [];
  for (var i = 0; i < polygons2D.length; i++) {
    var poly2D = polygons2D[i];
    if (poly2D.length < 3) continue;

    if (depth == null) {
      var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(this.polygon.shell, normal));
      //we lost depth or z off in 2d sketch, calculate it again
      depth = normal.dot(face.polygon.shell[0]);
    }

    var shell = [];
    for (var m = 0; m < poly2D.length; ++m) {
      var a = _3dTransformation.apply(new TCAD.Vector(poly2D[m][0], poly2D[m][1], depth));
      shell.push(a)
    }
    sketchedPolygons.push(new TCAD.Polygon(shell));
  }
  var newSolidFaces = [];
  for (var i = 0; i < sketchedPolygons.length; i++) {
    var extruded = TCAD.geom.extrude(sketchedPolygons[i], normal.multiply(height));
    newSolidFaces = newSolidFaces.concat(newSolidFaces, extruded);
  }
  
  for (var i = 0; i < solid.polyFaces.length; i++) {
    newSolidFaces.push(solid.polyFaces[i].polygon);
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
  this.app.viewer.scene.remove( solid.meshObject );
  this.app.viewer.scene.add( TCAD.utils.createSolidMesh(faces) );
  this.app.viewer.render();
};
