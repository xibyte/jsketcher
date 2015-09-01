
TCAD.UI = function(app) {
  this.app = app;
  this.viewer = app.viewer;
  this.dat = new dat.GUI();
  var ui = this;
  var gui = this.dat;

  var actionsF = gui.addFolder('Add Object');
  var actions = new TCAD.UI.Actions(this);
  actionsF.add(actions.tools, 'extrude');
  actionsF.add(actions.tools, 'cut');
  actionsF.add(actions.tools, 'edit');
  actionsF.add(actions.tools, 'save');
  actionsF.add(actions.tools, 'refreshSketches');
  actionsF.open();

  var camera =  gui.addFolder('Camera');
  camera.add(app.viewer.camera.position, 'x').listen();
  camera.add(app.viewer.camera.position, 'y').listen();
  camera.add(app.viewer.camera.position, 'z').listen();
  camera.open();

  this.solidFolder = null;
};

TCAD.UI.prototype.setSolid = function(solid) {
  if (this.solidFolder !== null) {
    this.solidFolder.remove();
  }
  this.solidFolder = this.dat.addFolder("Solid Properties");
  this.solidFolder.add(solid.wireframeGroup, 'visible').listen()
};

TCAD.UI.Actions = function(scope) {

  this.tools = {

    extrude : function() {
      scope.app.extrude();
    },

    cut : function() {
      scope.app.cut();
    },

    edit : function() {
      scope.app.sketchFace();
    },

    save : function() {
      scope.app.save();
    },

    refreshSketches : function() {
      scope.app.refreshSketches();
    },

    undo : function() {
      scope.app.undo();
    },

    redo : function() {
      scope.app.redo();
    }


  };
};
