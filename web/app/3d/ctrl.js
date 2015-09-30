
TCAD.UI = function(app) {
  this.app = app;
  this.viewer = app.viewer;

  var tk = TCAD.toolkit;
  var mainBox = new tk.Box();
  mainBox.root.css({height : '100%'});
  var propFolder = new tk.Folder("Solid's Properties");
  var cameraFolder = new tk.Folder("Camera");
  var objectsFolder = new tk.Folder("Objects");
  var modificationsFolder = new tk.Folder("Modifications");
  var extrude, cut, edit, refreshSketches;
  tk.add(mainBox, propFolder);
  tk.add(propFolder, extrude = new tk.Button("Extrude"));
  tk.add(propFolder, cut = new tk.Button("Cut"));
  tk.add(propFolder, edit = new tk.Button("Edit"));
  tk.add(propFolder, refreshSketches = new tk.Button("Refresh Sketches"));
  tk.add(propFolder, new tk.Text("Message"));
  tk.add(mainBox, cameraFolder);
  tk.add(cameraFolder, new tk.Number("x"));
  tk.add(cameraFolder, new tk.Number("y"));
  tk.add(cameraFolder, new tk.Number("z"));
  tk.add(mainBox, objectsFolder);
  tk.add(mainBox, modificationsFolder);
  var modificationsTreeComp = new tk.Tree();
  tk.add(modificationsFolder, modificationsTreeComp);

  var ui = this;

  this.app.bus.subscribe("craft", function() {
    var data = {children : []};
    for (var i = 0; i < app.craft.history.length; i++) {
      var op = app.craft.history[i];
      data.children.push(ui.getInfoForOp(op));
    }
    modificationsTreeComp.set(data);
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
      var deflection = new tk.Number("Deflection", 0);
      var angle = new tk.Number("Angle", 0);
      var wizard = new TCAD.wizards.ExtrudeWizard(app.viewer, polygons);
      function onChange() {
        var depthValue = theValue.input.val();
        var scaleValue = scale.input.val();
        var target = isCut ? normal.negate() : normal;
        target = target.multiply(depthValue);
        wizard.update(target, normal, scaleValue);
        app.viewer.render()
      }
      theValue.input.on('t-change', onChange);
      scale.input.on('t-change', onChange);
      onChange();
      tk.add(folder, theValue);
      tk.add(folder, scale);
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
          depth : depthValue
        });
        close();
      }
      function applyExtrude() {
        var heightValue = theValue.input.val();
        app.craft.modify({
          type: 'PAD',
          solids : [face.solid],
          face : face,
          height : heightValue
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
