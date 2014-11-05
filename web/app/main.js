TCAD = {};

TCAD.App = function() {

  this.id = "DEFAULT";
  this.viewer = new TCAD.Viewer();
  this.ui = new TCAD.UI(this);


  var box = TCAD.utils.createSolid(TCAD.utils.createBox(500));
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


  function storage_handler(evt) {
      console.log('The modified key was '+evt.key);
      console.log('The original value was '+evt.oldValue);
      console.log('The new value is '+evt.newValue);
      console.log('The URL of the page that made the change was '+evt.url);
      console.log('The window where the change was made was '+evt.source);
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
