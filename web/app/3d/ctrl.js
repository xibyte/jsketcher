import * as tk from '../ui/toolkit'
import * as cad_utils from './cad-utils'
import * as math from '../math/math'
import * as workbench from './workbench'
import ToolBar from '../ui/toolbar'
import {ExtrudeWizard} from './wizards/extrude'
import {PlaneWizard} from './wizards/plane'
import {BoxWizard} from './wizards/box'
import {SphereWizard} from './wizards/sphere'
import {TransformWizard} from './wizards/transform'
import {IO} from '../sketcher/io'

function UI(app) {
  this.app = app;
  this.viewer = app.viewer;

  var mainBox = this.mainBox =  new tk.Box();
  mainBox.root.css({height : '100%'});
  var propFolder = new tk.Folder("Model");
  var debugFolder = new tk.Folder("Debug");
  var exportFolder = new tk.Folder("Export");
  var modificationsFolder = new tk.Folder("Modifications");
  var save, deselectAll, refreshSketches, showSketches, printSolids, printFace, printFaceId, finishHistory, stlExport;
  tk.add(mainBox, propFolder);
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

  this.craftToolBar = this.createCraftToolBar();
  this.createBoolToolBar(this.craftToolBar.node.position().top + this.craftToolBar.node.height() + 20);
  
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
      var icon = UI.getIconForOp(op);
      if (icon != null) {
        tk.List.setIconForRow(row, icon);
      }
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

  refreshSketches.root.click(tk.methodRef(app, "refreshSketches"));
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
    ui.registerWizard(new TransformWizard(app.viewer, solid));
  });
}

UI.prototype.cutExtrude = function(isCut) {
  return () => {
    var selection = this.app.viewer.selectionMgr.selection;
    if (selection.length == 0) {
      return;
    }
    this.registerWizard(new ExtrudeWizard(this.app, selection[0], isCut), false);
  }
};

UI.prototype.createCraftToolBar = function () {
  var toolBar = new ToolBar();
  toolBar.add('Edit', 'img/3d/face-edit96.png', () => this.app.sketchFace());
  toolBar.add('Cut', 'img/3d/cut96.png', this.cutExtrude(true));
  toolBar.add('Extrude', 'img/3d/extrude96.png', this.cutExtrude(false));
  toolBar.add('Plane', 'img/3d/plane96.png', () => this.registerWizard(new PlaneWizard(this.app.viewer), false));
  toolBar.add('Box', 'img/3d/cube96.png', () => this.registerWizard(new BoxWizard(this.app.viewer), false));
  toolBar.add('Sphere', 'img/3d/sphere96.png', () => this.registerWizard(new SphereWizard(this.app.viewer), false));
  $('body').append(toolBar.node);
  return toolBar;
};

UI.prototype.createBoolToolBar = function(vertPos) {
  var toolBar = new ToolBar();
  toolBar.add('Intersection', 'img/3d/intersection96.png', () => this.app.sketchFace());
  toolBar.add('Difference', 'img/3d/difference96.png', this.cutExtrude(true));
  toolBar.add('Union', 'img/3d/union96.png', this.cutExtrude(false));
  $('body').append(toolBar.node);
  toolBar.node.css({top : vertPos + 'px'});
  return toolBar;
};


UI.prototype.registerWizard = function(wizard, overridingHistory) {
  wizard.ui.box.root.css({left : (this.mainBox.root.width() + this.craftToolBar.node.width() + 30) + 'px', top : 0});
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
  } else if ('SPHERE' === op.type) {
    return op.type + " (" + p.radius + ")";
  }
  return op.type;
};

UI.getIconForOp = function(op) {
  if ('CUT' === op.type) {
    return 'img/3d/cut32.png';
  } else if ('PAD' === op.type) {
    return 'img/3d/extrude32.png';
  } else if ('BOX' === op.type) {
    return 'img/3d/cube32.png';
  } else if ('PLANE' === op.type) {
    return 'img/3d/plane32.png';
  } else if ('SPHERE' === op.type) {
    return 'img/3d/sphere32.png';
  }
  return null;
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
  } else if ('SPHERE' === op.type) {
    wizard = new SphereWizard(this.app.viewer, initParams);
  }
  this.registerWizard(wizard, true);
  return wizard;
};

export {UI}