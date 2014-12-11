TCAD = {};

TCAD.App = function() {

  this.id = "DEFAULT";
  this.viewer = new TCAD.Viewer();
  this.ui = new TCAD.UI(this);
  this.craft = new TCAD.Craft(this);


  var box = TCAD.utils.createSolidMesh(TCAD.utils.createBox(500));
  this.viewer.scene.add( box );
  for (var i = 0; i < box.geometry.polyFaces.length; i++) {
    var sketchFace = box.geometry.polyFaces[i];
    var faceStorageKey = this.faceStorageKey(sketchFace.id);

    var savedFace = localStorage.getItem(faceStorageKey);
    if (savedFace != null) {
      var geom = TCAD.workbench.readSketchGeom(JSON.parse(savedFace));
      sketchFace.syncSketches(geom);
      this.viewer.scene.add(sketchFace.sketch3DGroup);
    }
  }
  this.viewer.render();

  var viewer = this.viewer;
  var app = this;
  function storage_handler(evt) {
//      console.log('The modified key was '+evt.key);
//      console.log('The original value was '+evt.oldValue);
//      console.log('The new value is '+evt.newValue);
//      console.log('The URL of the page that made the change was '+evt.url);
//      console.log('The window where the change was made was '+evt.source);

    var prefix = "TCAD.projects."+app.id+".sketch.";
    if (evt.key.indexOf(prefix) < 0) return;
    var sketchFaceId = evt.key.substring(prefix.length);

    for (var oi = 0; oi < viewer.scene.children.length; ++oi) {
      var obj = viewer.scene.children[oi];
      if (obj.geometry !== undefined && obj.geometry.polyFaces !== undefined) {
        for (var i = 0; i < box.geometry.polyFaces.length; i++) {
          var sketchFace = box.geometry.polyFaces[i];
          if (sketchFace.id == sketchFaceId) {
            var geom = TCAD.workbench.readSketchGeom(JSON.parse(evt.newValue));
            sketchFace.syncSketches(geom);
            viewer.render();
            break;
          }
        }
      }
    }
  }

  window.addEventListener('storage', storage_handler, false);
};

TCAD.App.prototype.faceStorageKey = function(polyFaceId) {
  return "TCAD.projects."+this.id+".sketch." + polyFaceId;
};

TCAD.App.prototype.sketchFace = function() {
  if (this.viewer.selectionMgr.selection.length == 0) {
    return;
  }
  var polyFace = this.viewer.selectionMgr.selection[0];
  var faceStorageKey = this.faceStorageKey(polyFace.id);

  var savedFace = localStorage.getItem(faceStorageKey);
  var data;
  if (savedFace == null) {
    data = {};
  } else {
    data = JSON.parse(savedFace);
  }
  data.boundary = polyFace.polygon.to2D();
  localStorage.setItem(faceStorageKey, JSON.stringify(data));

  window.open("canvas.html#" + faceStorageKey.substring(14), "Edit Sketch", "height=900,width=1200");
};

TCAD.App.prototype.extrude = function() {

  if (this.viewer.selectionMgr.selection.length == 0) {
    return;
  }
  var polyFace = this.viewer.selectionMgr.selection[0];
  var height = prompt("Height", "50");
  
  var app = this;
  this.craft.modify(polyFace.solid, function() {
    return TCAD.craft.extrude(app, polyFace, height);
  });
};

TCAD.App.prototype.cut = function(face, depth) {

};
