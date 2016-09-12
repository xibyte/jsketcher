import * as tk from '../ui/toolkit'
import * as cad_utils from './cad-utils'
import * as math from '../math/math'
import * as workbench from './workbench'
import {ExtrudeWizard} from './wizards/extrude'
import {PlaneWizard} from './wizards/plane'
import {BoxWizard} from './wizards/box'
import {TransformWizard} from './wizards/transform'
import {IO} from '../sketcher/io'

function UI(app) {
  this.app = app;
  this.viewer = app.viewer;

  var mainBox = this.mainBox =  new tk.Box();
  mainBox.root.css({height : '100%'});
  var propFolder = new tk.Folder("Solid's Properties");
  var debugFolder = new tk.Folder("Debug");
  var exportFolder = new tk.Folder("Export");
  var modificationsFolder = new tk.Folder("Modifications");
  var extrude, cut, edit, addPlane, addBox, save, deselectAll,
    refreshSketches, showSketches, printSolids, printFace, printFaceId, finishHistory, stlExport;
  tk.add(mainBox, propFolder);
  tk.add(propFolder, extrude = new tk.Button("Extrude"));
  tk.add(propFolder, cut = new tk.Button("Cut"));
  tk.add(propFolder, edit = new tk.Button("Edit"));
  tk.add(propFolder, addPlane = new tk.Button("Add a Plane"));
  tk.add(propFolder, addBox = new tk.Button("Add a Box"));
  tk.add(propFolder, refreshSketches = new tk.Button("Refresh Sketches"));
  tk.add(propFolder, save = new tk.Button("Save"));
  tk.add(propFolder, showSketches = new tk.CheckBox("Show Sketches", true));
  tk.add(propFolder, deselectAll = new tk.Button("Deselect All"));
  tk.add(mainBox, exportFolder);
  tk.add(exportFolder, stlExport = new tk.Button("STL"));
  //tk.add(mainBox, debugFolder);
  tk.add(debugFolder, printSolids = new tk.Button("Print Solids"));
  tk.add(debugFolder, printFace = new tk.Button("Print Face"));
  tk.add(debugFolder, printFaceId = new tk.Button("Print Face ID"));
  tk.add(mainBox, modificationsFolder);
  var modificationsListComp = new tk.List();
  tk.add(modificationsFolder, modificationsListComp);

  var ui = this;
  
  function setHistory() {
    ui.app.craft.finishHistoryEditing();
  }
  finishHistory = new tk.ButtonRow(["Finish History Editing"], [setHistory]);
  finishHistory.root.hide();
  tk.add(modificationsFolder, finishHistory);
  var historyWizard = null;
  function updateHistoryPointer() {
    if (historyWizard != null) {
      historyWizard.dispose();
      historyWizard = null;
    }
    
    var craft = ui.app.craft;
    var historyEditMode = craft.historyPointer != craft.history.length;
    if (historyEditMode) {
      var rows = modificationsListComp.root.find('.tc-row');
      rows.removeClass('history-selected');
      rows.eq(craft.historyPointer).addClass('history-selected');
      var op = craft.history[craft.historyPointer];
      historyWizard = ui.createWizardForOperation(op, app);
      finishHistory.root.show();
    } else {
      finishHistory.root.hide();
    }
  }
  
  this.app.bus.subscribe("craft", function() {
    modificationsListComp.root.empty();
    for (var i = 0; i < app.craft.history.length; i++) {
      var op = app.craft.history[i];
      var row = modificationsListComp.addRow(ui.getInfoForOp(op));
      (function(i) {
        row.click(function () {
          ui.app.craft.historyPointer = i;
        })
      })(i);
    }
    updateHistoryPointer();
  });

  this.app.bus.subscribe("refreshSketch", function() {
    if (historyWizard != null) {
      var craft = ui.app.craft;
      var op = JSON.parse(JSON.stringify(craft.history[craft.historyPointer]));
      op.protoParams = historyWizard.getParams();
      historyWizard.dispose();
      historyWizard = ui.createWizardForOperation(op, app);
    }
  });

  this.app.bus.subscribe("historyPointer", function() {
    //updateHistoryPointer();
  });

  function cutExtrude(isCut) {
    return function() {
      var selection = app.viewer.selectionMgr.selection;
      if (selection.length == 0) {
        return;
      }
      ui.registerWizard(new ExtrudeWizard(ui.app, selection[0], isCut), false);
    }
  }

  cut.root.click(cutExtrude(true));
  extrude.root.click(cutExtrude(false));
  edit.root.click(tk.methodRef(app, "sketchFace"));
  refreshSketches.root.click(tk.methodRef(app, "refreshSketches"));
  addPlane.root.click(function() {
    ui.registerWizard(new PlaneWizard(app.viewer), false)
  });
  addBox.root.click(function() {
    ui.registerWizard(new BoxWizard(app.viewer), false)
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
  deselectAll.root.click(function() {
    app.viewer.selectionMgr.deselectAll();
  });
  stlExport.root.click(function() {
    var allPolygons = cad_utils.arrFlatten1L(app.findAllSolids().map(function (s) {
      return s.csg.toPolygons()
    }));
    var stl = CSG.fromPolygons(allPolygons).toStlString();
    IO.exportTextData(stl.data[0], app.id + ".stl");
  });
  app.bus.subscribe("solid-pick", function(solid) {
    new TransformWizard(app.viewer, solid).createUI(mainBox);
  });
}

UI.prototype.registerWizard = function(wizard, overridingHistory) {
  wizard.ui.box.root.css({left : (this.mainBox.root.width() + 10) + 'px', top : 0});
  var craft = this.app.craft; 
  wizard.apply = function() {
    craft.modify(wizard.createRequest(), overridingHistory);
  };
  return wizard;
};

UI.prototype.getInfoForOp = function(op) {
  var p = op.params;
  var norm2 = math.norm2;
  if ('CUT' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('PAD' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('BOX' === op.type) {
    return op.type + " (" + p.w + ", " + p.h + ", " + p.d + ")";
  } else if ('PLANE' === op.type) {
    return op.type + " (" + p.depth + ")";
  }
  return op.type;
};


UI.prototype.createWizardForOperation = function(op) {
  var initParams = op.protoParams;
  var face = op.face !== undefined ? this.app.findFace(op.face) : null;
  if (face != null) {
    this.app.viewer.selectionMgr.select(face);
  }
  var wizard;
  if ('CUT' === op.type) {
    wizard = new ExtrudeWizard(this.app, face, true, initParams);
  } else if ('PAD' === op.type) {
    wizard = new ExtrudeWizard(this.app, face, false, initParams);
  } else if ('PLANE' === op.type) {
    wizard = new PlaneWizard(this.app.viewer, initParams);
  } else if ('BOX' === op.type) {
    wizard = new BoxWizard(this.app.viewer, initParams);
  }
  this.registerWizard(wizard, true);
  return wizard;
};

export {UI}