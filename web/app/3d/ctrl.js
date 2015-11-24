
TCAD.UI = function(app) {
  this.app = app;
  this.viewer = app.viewer;

  var tk = TCAD.toolkit;
  var mainBox = new tk.Box();
  mainBox.root.css({height : '100%'});
  var propFolder = new tk.Folder("Solid's Properties");
  var debugFolder = new tk.Folder("Debug");
  var cameraFolder = new tk.Folder("Camera");
  var objectsFolder = new tk.Folder("Objects");
  var modificationsFolder = new tk.Folder("Modifications");
  var extrude, cut, edit, addPlane, save,
    refreshSketches, showSketches, printSolids, printFace, printFaceId;
  tk.add(mainBox, propFolder);
  tk.add(propFolder, extrude = new tk.Button("Extrude"));
  tk.add(propFolder, cut = new tk.Button("Cut"));
  tk.add(propFolder, edit = new tk.Button("Edit"));
  tk.add(propFolder, addPlane = new tk.Button("Add a Plane"));
  tk.add(propFolder, refreshSketches = new tk.Button("Refresh Sketches"));
  tk.add(propFolder, save = new tk.Button("Save"));
  tk.add(propFolder, showSketches = new tk.CheckBox("Show Sketches", true));
  tk.add(mainBox, debugFolder);
  tk.add(debugFolder, printSolids = new tk.Button("Print Solids"));
  tk.add(debugFolder, printFace = new tk.Button("Print Face"));
  tk.add(debugFolder, printFaceId = new tk.Button("Print Face ID"));
  tk.add(mainBox, cameraFolder);
  tk.add(cameraFolder, new tk.Number("x"));
  tk.add(cameraFolder, new tk.Number("y"));
  tk.add(cameraFolder, new tk.Number("z"));
  tk.add(mainBox, objectsFolder);
  tk.add(mainBox, modificationsFolder);
  var modificationsListComp = new tk.List();
  tk.add(modificationsFolder, modificationsListComp);

  var ui = this;

  this.app.bus.subscribe("craft", function() {
    modificationsListComp.root.empty();
    for (var i = 0; i < app.craft.history.length; i++) {
      var op = app.craft.history[i];
      modificationsListComp.addRow(ui.getInfoForOp(op));
    }
  });

  function cutExtrude(isCut) {
    return function() {
      if (app.viewer.selectionMgr.selection.length == 0) {
        return;
      }
      var face = app.viewer.selectionMgr.selection[0];
      var normal = TCAD.utils.vec(face.csgGroup.plane.normal);
      var polygons = TCAD.craft.getSketchedPolygons3D(app, face);

      var box = new tk.Box();
      box.root.css({left : (mainBox.root.width() + 10) + 'px', top : 0});
      var folder = new tk.Folder(isCut ? "Cut Options" : "Extrude Options");
      tk.add(box, folder);
      var theValue = new tk.Number(isCut ? "Depth" : "Height", 50);
      var scale = new tk.Number("Expansion", 1, 0.1);
      var deflection = new tk.Number("Deflection", 0, 1);
      var angle = new tk.Number("Angle", 0, 5);
      var wizard = new TCAD.wizards.ExtrudeWizard(app.viewer, polygons);
      function onChange() {
        var depthValue = theValue.input.val();
        var scaleValue = scale.input.val();
        var deflectionValue = deflection.input.val();
        var angleValue = angle.input.val();
        if (isCut) depthValue *= -1;
        wizard.update(face._basis, normal, depthValue, scaleValue, deflectionValue, angleValue);
        app.viewer.render()
      }
      theValue.input.on('t-change', onChange);
      scale.input.on('t-change', onChange);
      deflection.input.on('t-change', onChange);
      angle.input.on('t-change', onChange);
      onChange();
      tk.add(folder, theValue);
      tk.add(folder, scale);
      tk.add(folder, deflection);
      tk.add(folder, angle);
      function close() {
        box.close();
        wizard.dispose();
      }
      function applyCut() {
        var depthValue = theValue.input.val();
        app.craft.modify({
          type: 'CUT',
          solids : [face.solid],
          face : face,
          params : wizard.operationParams
        });
        close();
      }
      function applyExtrude() {
        var heightValue = theValue.input.val();
        app.craft.modify({
          type: 'PAD',
          solids : [face.solid],
          face : face,
          params : wizard.operationParams
        });
        close();
      }

      tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [close, isCut ? applyCut : applyExtrude]));
    }
  }

  cut.root.click(cutExtrude(true));
  extrude.root.click(cutExtrude(false));
  edit.root.click(tk.methodRef(app, "sketchFace"));
  refreshSketches.root.click(tk.methodRef(app, "refreshSketches"));
  addPlane.root.click(function() {
    var box = new tk.Box();
    box.root.css({left : (mainBox.root.width() + 10) + 'px', top : 0});
    var folder = new tk.Folder("Add a Plane");
    tk.add(box, folder);
    var choice = ['XY', 'XZ', 'ZY'];
    var orientation = new tk.InlineRadio(choice, choice, 0);
    var depth = new tk.Number("Depth", 0);

    tk.add(folder, orientation);
    tk.add(folder, depth);
    var wizard = new TCAD.wizards.PlaneWizard(app.viewer);
    function onChange() {
      wizard.update(orientation.getValue(), depth.input.val());
    }
    function close() {
      box.close();
      wizard.dispose();
    }
    function ok() {
      app.craft.modify({
        type: 'PLANE',
        solids : [],
        params : wizard.operationParams
      });
      close();
    }
    orientation.root.find('input:radio').change(onChange);
    depth.input.on('t-change', onChange);
    onChange();
    tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [close, ok]));
  });
  printSolids.root.click(function () {
    app.findAllSolids().map(function(o) {
      console.log("Solid ID: " + o.tCadId);
      console.log(JSON.stringify(o.csg));
    });
  });
  printFace.root.click(function () {
    var s = app.viewer.selectionMgr.selection[0];
    console.log(JSON.stringify({
      polygons : s.csgGroup.polygons,
      basis : s._basis
    }));
  });
  printFaceId.root.click(function () {
    console.log(app.viewer.selectionMgr.selection[0].id);
  });
  showSketches.input.click(function () {
    var enabled = this.checked;
    var solids = app.findAllSolids();
    for (var i = 0; i < solids.length; i++) {
      for (var j = 0; j < solids[i].polyFaces.length; j++) {
        var face = solids[i].polyFaces[j];
        if (face.sketch3DGroup != null) face.sketch3DGroup.visible = enabled;
      }
    }
    app.viewer.render();
  });
  save.root.click(function() {
    app.save();
  });

  this.solidFolder = null;
};

TCAD.UI.prototype.getInfoForOp = function(op) {
  var p = op.params;
  var norm2 = TCAD.math.norm2;
  if ('CUT' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('PAD' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('BOX' === op.type) {
    return op.type + " (" + op.size + ")";
  } else if ('PLANE' === op.type) {
    return op.type + " (" + p.depth + ")";
  }
  return op.type;
};

TCAD.UI.prototype.setSolid = function(solid) {
  if (this.solidFolder !== null) {
    this.solidFolder.remove();
  }
  this.solidFolder = this.dat.addFolder("Solid Properties");
  this.solidFolder.add(solid.wireframeGroup, 'visible').listen()
};
