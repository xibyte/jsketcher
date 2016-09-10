import * as tk from '../ui/toolkit'
import * as cad_utils from './cad-utils'
import * as math from '../math/math'
import * as workbench from './workbench'
import {ExtrudeWizard, PlaneWizard} from './wizards/wizards'
import {IO} from '../sketcher/io'

function UI(app) {
  this.app = app;
  this.viewer = app.viewer;

  var mainBox = new tk.Box();
  mainBox.root.css({height : '100%'});
  var propFolder = new tk.Folder("Solid's Properties");
  var debugFolder = new tk.Folder("Debug");
  var exportFolder = new tk.Folder("Export");
  var modificationsFolder = new tk.Folder("Modifications");
  var extrude, cut, edit, addPlane, save, deselectAll,
    refreshSketches, showSketches, printSolids, printFace, printFaceId, finishHistory, stlExport;
  tk.add(mainBox, propFolder);
  tk.add(propFolder, extrude = new tk.Button("Extrude"));
  tk.add(propFolder, cut = new tk.Button("Cut"));
  tk.add(propFolder, edit = new tk.Button("Edit"));
  tk.add(propFolder, addPlane = new tk.Button("Add a Plane"));
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
      historyWizard.close();
      historyWizard = null;
    }
    
    var craft = ui.app.craft;
    var historyEditMode = craft.historyPointer != craft.history.length;
    if (historyEditMode) {
      var rows = modificationsListComp.root.find('.tc-row');
      rows.removeClass('history-selected');
      rows.eq(craft.historyPointer).addClass('history-selected');
      var op = craft.history[craft.historyPointer];
      historyWizard = UI.createWizard(op, app, mainBox);
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
      op.protoParams = historyWizard.currentParams();
      historyWizard.close();
      historyWizard = UI.createWizard(op, app, mainBox);
    }
  });

  this.app.bus.subscribe("historyPointer", function() {
    //updateHistoryPointer();
  });


  function cutExtrude(isCut) {
    return function() {
      if (app.viewer.selectionMgr.selection.length == 0) {
        return;
      }
      UI.createCutExtrudeWizard(isCut, ui.app, app.viewer.selectionMgr.selection[0], mainBox);
    }
  }

  cut.root.click(cutExtrude(true));
  extrude.root.click(cutExtrude(false));
  edit.root.click(tk.methodRef(app, "sketchFace"));
  refreshSketches.root.click(tk.methodRef(app, "refreshSketches"));
  addPlane.root.click(function() {
    UI.createPlaneWizard(app, mainBox);
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
  })
}

UI.prototype.getInfoForOp = function(op) {
  var p = op.params;
  var norm2 = math.norm2;
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

UI.createWizard = function(op, app, alignComponent) {
  var initParams = op.protoParams;
  var face = op.face !== undefined ? app.findFace(op.face) : null;
  if (face != null) {
    app.viewer.selectionMgr.select(face);
  }
  if ('CUT' === op.type) {
    return UI.createCutExtrudeWizard(true, app, face, alignComponent, initParams, true);
  } else if ('PAD' === op.type) {
    return UI.createCutExtrudeWizard(false, app, face, alignComponent, initParams, true);
  } else if ('PLANE' === op.type) {
    return UI.createPlaneWizard(app, alignComponent, initParams, true);
  }
  return null;
};


UI.createCutExtrudeWizard = function (isCut, app, face, alignComponent, initParams, overriding) {
  function def(index, fallback) {
    return !!initParams ? initParams[index] : fallback;
  }

  var normal = cad_utils.vec(face.csgGroup.plane.normal);
  var polygons = workbench.getSketchedPolygons3D(app, face);

  var box = new tk.Box();
  box.root.css({left : (alignComponent.root.width() + 10) + 'px', top : 0});
  var folder = new tk.Folder(isCut ? "Cut Options" : "Extrude Options");
  tk.add(box, folder);
  var theValue = new tk.Number(isCut ? "Depth" : "Height", def(0, 50));
  var scale = new tk.Number("Expansion", def(1, 1), 0.1, 1);
  var deflection = new tk.Number("Deflection", def(2, 0), 1);
  var angle = new tk.Number("Angle", def(3, 0), 5);
  var wizard = new ExtrudeWizard(app.viewer, polygons);
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
  function protoParams() {
    var depthValue = theValue.input.val();
    var scaleValue = scale.input.val();
    var deflectionValue = deflection.input.val();
    var angleValue = angle.input.val();
    return [depthValue, scaleValue, deflectionValue, angleValue];
  }
  function applyCut() {
    app.craft.modify({
      type: 'CUT',
      solids : [app.findSolid(face.solid.tCadId)],
      face : app.findFace(face.id),
      params : wizard.operationParams,
      protoParams : protoParams()
    }, overriding);
    close();
  }
  function applyExtrude() {
    app.craft.modify({
      type: 'PAD',
      solids : [app.findSolid(face.solid.tCadId)],
      face : app.findFace(face.id),
      params : wizard.operationParams,
      protoParams : protoParams()
    }, overriding);
    close();
  }

  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [close, isCut ? applyCut : applyExtrude]));
  return new UI.WizardRef(wizard, box, close, protoParams);
};

UI.createPlaneWizard = function (app, alignComponent, initParams, overiding) {
  var box = new tk.Box();
  box.root.css({left : (alignComponent.root.width() + 10) + 'px', top : 0});
  var folder = new tk.Folder("Add a Plane");
  tk.add(box, folder);
  var choice = ['XY', 'XZ', 'ZY'];
  var orientation = new tk.InlineRadio(choice, choice, !initParams ? 0 : choice.indexOf(initParams[0]));
  var depth = new tk.Number("Depth", !initParams ? 0 : initParams[1]);

  tk.add(folder, orientation);
  tk.add(folder, depth);
  var wizard = new PlaneWizard(app.viewer);
  var orientationValue, w;
  function onChange() {
    wizard.update(orientationValue = orientation.getValue(), w = depth.input.val());
  }
  function close() {
    box.close();
    wizard.dispose();
  }
  function protoParams() {
    return [orientationValue, w];
  }
  function ok() {
    app.craft.modify({
      type: 'PLANE',
      solids : [],
      params : wizard.operationParams,
      protoParams : protoParams()
    }, overiding);
    close();
  }
  orientation.root.find('input:radio').change(onChange);
  depth.input.on('t-change', onChange);
  onChange();
  tk.add(folder, new tk.ButtonRow(["Cancel", "OK"], [close, ok]));
  return new UI.WizardRef(wizard, box, close, protoParams);
};

UI.WizardRef = function(wizard, box, close, currentParams) {
  this.wizard = wizard;
  this.box = box;
  this.close = close;
  this.currentParams = currentParams;
};

export {UI}