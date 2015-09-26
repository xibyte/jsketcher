
TCAD.UI = function(app) {
  this.app = app;
  this.viewer = app.viewer;

  var box = new TCAD.toolkit.Box();
  box.root.css({height : '100%'});
  var propFolder = new TCAD.toolkit.Folder("Solid's Properties");
  var cameraFolder = new TCAD.toolkit.Folder("Camera");
  var objectsFolder = new TCAD.toolkit.Folder("Objects");
  var modificationsFolder = new TCAD.toolkit.Folder("Modifications");
  var extrude, cut, edit;
  TCAD.toolkit.add(box, propFolder);
  TCAD.toolkit.add(propFolder, extrude = new TCAD.toolkit.Button("Extrude"));
  TCAD.toolkit.add(propFolder, cut = new TCAD.toolkit.Button("Cut"));
  TCAD.toolkit.add(propFolder, new TCAD.toolkit.Button("Edit"));
  TCAD.toolkit.add(propFolder, new TCAD.toolkit.Button("Refresh Sketches"));
  TCAD.toolkit.add(propFolder, new TCAD.toolkit.Text("Message"));
  TCAD.toolkit.add(box, cameraFolder);
  TCAD.toolkit.add(cameraFolder, new TCAD.toolkit.Number("x"));
  TCAD.toolkit.add(cameraFolder, new TCAD.toolkit.Number("y"));
  TCAD.toolkit.add(cameraFolder, new TCAD.toolkit.Number("z"));
  TCAD.toolkit.add(box, objectsFolder);
  TCAD.toolkit.add(box, modificationsFolder);
  var modificationsTreeComp = new TCAD.toolkit.Tree();
  TCAD.toolkit.add(modificationsFolder, modificationsTreeComp);

  var ui = this;

  this.app.bus.subscribe("craft", function() {
    var data = {children : []};
    for (var i = 0; i < app.craft.history.length; i++) {
      var op = app.craft.history[i];
      data.children.push(ui.getInfoForOp(op));
    }
    modificationsTreeComp.set(data);
  });

  cut.root.click(function() {
    if (app.viewer.selectionMgr.selection.length == 0) {
      return;
    }
    var face = app.viewer.selectionMgr.selection[0];
    var normal = TCAD.utils.vec(face.csgGroup.plane.normal);
    var polygons = TCAD.craft.getSketchedPolygons3D(app, face);

    var tk = TCAD.toolkit;
    var ops = new tk.Box();
    ops.root.css({left : (box.root.width() + 10) + 'px', top : 0});
    var folder = new tk.Folder("Cut Options");
    tk.add(ops, folder);
    var depth = new tk.Number("Depth", 50);
    var wizard = new TCAD.wizards.ExtrudeWizard(app.viewer, polygons);
    depth.input.on('t-change', function() {
      var depthValue = $(this).val();
      var target = normal.negate().multiply(depthValue);
      wizard.update(target);
      app.viewer.render()
    });
    depth.input.trigger('t-change');
    tk.add(folder, depth);
    tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [tk.methodRef(folder, "close"), ]));
  });

  this.dat = new dat.GUI();
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

TCAD.UI.prototype.getInfoForOp = function(op) {
  var info = {name : op.type};
  if ('CUT' === op.type) {
    info.name +=  " (" + op.depth + ")";
    info.children = [{name : "depth : " + op.depth}]
  } else if ('BOX' === op.type) {
    info.name +=  " (" + op.size + ")";
    info.children = [{name : "size : " + op.size}]
  }
  return info;
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
