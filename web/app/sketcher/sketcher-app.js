import {Viewer} from './viewer2d.js'
import * as ui from '../ui/ui'
import {Terminal} from '../ui/terminal'
import {BBox, IO} from './io'
import {AddCircleDimTool, AddFreeDimTool, AddHorizontalDimTool, AddVerticalDimTool} from './tools/dim'
import {AddPointTool} from './tools/point'
import {AddSegmentTool} from './tools/segment'
import {AddArcTool} from './tools/arc'
import {EditCircleTool} from './tools/circle'
import {FilletTool} from './tools/fillet'
import {EllipseTool} from './tools/ellipse'
import {BezierCurveTool} from './tools/bezier-curve'
import {RectangleTool} from './tools/rectangle'
import {OffsetTool} from './tools/offset'
import {ReferencePointTool} from './tools/origin'
import {InputManager} from './input-manager'
import genSerpinski from '../utils/genSerpinski';
import React from "react";
import {runActionOrToastWhyNot} from "./actions";
import {stream} from "../../../modules/lstream";

function App2D() {
  var app = this;

  this.viewer = new Viewer(document.getElementById('viewer'), IO);
  this.context = createAppContext(this.viewer);
  this.winManager = new ui.WinManager();
  this.inputManager = new InputManager(this);

  this.initSketchManager();
  this._exportWin = new ui.Window($('#exportManager'), app.winManager);

  $('#exportManager li').click(function() {ui.closeWin(app._exportWin);});

  this.constraintFilter = {};
  this.actions = {};
  this.commands = {};

  //For debug view
  this._actionsOrder = [];

  var dockEl = $('#dock');
  var buttonGroup = $('#status .button-group');
  this.dock = new ui.Dock(dockEl, buttonGroup, App2D.views);
  this.dock.show('Constraints');

  var consoleBtn = ui.dockBtn('Commands', 'list');
  buttonGroup.append(consoleBtn);
  this.commandsWin = new ui.Window($('#commands'), this.winManager);
  this.commandsWin.tileUpRelative = $('#viewer');
  consoleBtn.click((e) => {
    this.actions['terminal'].action(e)
  });
  $(document).on('mousemove', '#viewer', (e) => {
    let coord = this.viewer.screenToModel(e);
    $('.coordinates-info').text(this.viewer.roundToPrecision(coord.x) + " : " + this.viewer.roundToPrecision(coord.y));
  });
  this.terminalHandler = undefined;
  this.terminal = new Terminal(this.commandsWin, (command) => this.handleTerminalInput(command), () => this.getAllCommandList());
  this.bindToolsToTerminal();

  this.winManager.registerResize(dockEl, ui.DIRECTIONS.EAST, function() {$('body').trigger('layout'); });
  $('body').on('layout', this.viewer.onWindowResize);

  this.registerAction = function(id, desc, action, command) {
    app.actions[id] = {id, desc, action};
    if (command) {
      app.commands[command] = id;
    }
    app._actionsOrder.push(id);
  };

  function checkForTerminalVisibility() {
    const terminalVisible = app.commandsWin.root.is(':visible');
    if (terminalVisible) {
      app.terminal.scrollToTheEnd();
    }
    app.viewer.referencePoint.visible = terminalVisible;
  }
  checkForTerminalVisibility();

  this.registerAction('new', "Create New Sketch", function () {
    app.newSketch();
  });

  this.registerAction('terminal', "Open/Close Terminal Window", function () {
    app.commandsWin.toggle();
    checkForTerminalVisibility();
    app.viewer.refresh();
  });

  this.registerAction('open', "Open Sketch", function (e) {
    app._sketchesList.refresh();
    ui.openWin(app._sketchesWin, e);
  });

  this.registerAction('clone', "Clone Sketch", function () {
    app.cloneSketch();
  });

  this.registerAction('export', "Export", function (e) {
    ui.openWin(app._exportWin, e);
  });

  this.registerAction('exportSVG', "Export To SVG", function () {
    IO.exportTextData(app.viewer.io.svgExport(), app.getSketchId() + ".svg");
  });

  this.registerAction('exportDXF', "Export To DXF", function () {
    IO.exportTextData(app.viewer.io.dxfExport(), app.getSketchId() + ".dxf");
  });

  this.registerAction('undo', "Undo", function () {
    app.viewer.historyManager.undo();
  });

  this.registerAction('redo', "Redo", function () {
    app.viewer.historyManager.redo();
  });

  this.registerAction('checkpoint', "Checkpoint", function () {
    app.viewer.historyManager.checkpoint();
  });

  this.registerAction('referencePoint', "Set Reference Point", function () {
    app.viewer.toolManager.takeControl(new ReferencePointTool(app.viewer));
  }, "origin");

  this.registerAction('addPoint', "Add Point", function () {
    app.viewer.toolManager.takeControl(new AddPointTool(app.viewer));
  }, "point");

  this.registerAction('addSegment', "Add Segment", function () {
    app.viewer.toolManager.takeControl(new AddSegmentTool(app.viewer, false));
  }, 'line');

  this.registerAction('addMultiSegment', "Add Multi Segment", function () {
    app.viewer.toolManager.takeControl(new AddSegmentTool(app.viewer, true));
  }, 'mline');

  this.registerAction('addArc', "Add Arc", function () {
    app.viewer.toolManager.takeControl(new AddArcTool(app.viewer));
  }, 'arc');

  this.registerAction('addCircle', "Add Circle", function () {
    app.viewer.toolManager.takeControl(new EditCircleTool(app.viewer));
  }, 'circle');

  this.registerAction('addEllipse', "Add Ellipse", function () {
    app.viewer.toolManager.takeControl(new EllipseTool(app.viewer, false));
  });

  this.registerAction('addEllipticalArc', "Add Elliptical Arc", function () {
    app.viewer.toolManager.takeControl(new EllipseTool(app.viewer, true));
  });

  this.registerAction('addBezierCurve', "Add Bezier Curve", function () {
    app.viewer.toolManager.takeControl(new BezierCurveTool(app.viewer));
  });

  this.registerAction('addRectangle', "Add Rectangle", function () {
    app.viewer.toolManager.takeControl(new RectangleTool(app.viewer));
  }, 'rect');

  this.registerAction('offsetTool', "Polygon Offset", function () {
    app.viewer.toolManager.takeControl(new OffsetTool(app.viewer));
  });

  this.registerAction('pan', "Pan", function () {
    app.viewer.toolManager.releaseControl();
  });

  this.registerAction('addFillet', "Add Fillet", function () {
    app.viewer.toolManager.takeControl(new FilletTool(app.viewer));
  });

  this.registerAction('addDim', "Add Dimension", function () {
    app.viewer.toolManager.takeControl(new AddFreeDimTool(app.viewer, app.viewer.dimLayer));
  });

  this.registerAction('addHDim', "Add Horizontal Dimension", function () {
    app.viewer.toolManager.takeControl(new AddHorizontalDimTool(app.viewer, app.viewer.dimLayer));
  });

  this.registerAction('addVDim', "Add Vertical Dimension", function () {
    app.viewer.toolManager.takeControl(new AddVerticalDimTool(app.viewer, app.viewer.dimLayer));
  });

  this.registerAction('addCircleDim', "Add Circle Dimension", function () {
    app.viewer.toolManager.takeControl(new AddCircleDimTool(app.viewer, app.viewer.dimLayer));
  });

  this.registerAction('save', "Save", function () {
      var sketchData = app.viewer.io.serializeSketch();
      var sketchId = app.getSketchId();
      localStorage.setItem(app.getSketchId(), sketchData);
      app.viewer.historyManager.checkpoint();
  });

  this.registerAction('coincident', "Coincident", function () {
    runActionOrToastWhyNot('Coincident', app.viewer.selected, app.context);
  });

  this.registerAction('verticalConstraint', "Vertical Constraint", function () {
    runActionOrToastWhyNot('Vertical', app.viewer.selected, app.context);
  });

  this.registerAction('horizontalConstraint', "Horizontal Constraint", function () {
    runActionOrToastWhyNot('Horizontal', app.viewer.selected, app.context);
  });

  this.registerAction('parallelConstraint', "Parallel Constraint", function () {
    runActionOrToastWhyNot('Parallel', app.viewer.selected, app.context);
  });

  this.registerAction('perpendicularConstraint', "Perpendicular Constraint", function () {
    runActionOrToastWhyNot('Perpendicular', app.viewer.selected, app.context);
  });

  this.registerAction('P2LDistanceConstraint', "Distance Between Point and Line", function () {
    runActionOrToastWhyNot('DistancePL', app.viewer.selected, app.context);
  });

  this.registerAction('mirrorConstraint', "Mirror Constraint", function () {
    app.viewer.parametricManager.mirror(app.viewer.selected);
  });

  this.registerAction('P2PDistanceConstraint', "Distance Between two Points", function () {
    runActionOrToastWhyNot('DistancePP', app.viewer.selected, app.context);
  });

  this.registerAction('RadiusConstraint', "Radius Constraint", function () {
    app.viewer.parametricManager.radius(app.viewer.selected, prompt);
  });

  this.registerAction('EntityEqualityConstraint', "Radius Equals Constraint", function () {
    app.viewer.parametricManager.entityEquality(app.viewer.selected);
  });

  this.registerAction('tangentConstraint', "Tangent Constraint", function () {
    app.viewer.parametricManager.tangent(app.viewer.selected);
  });

  this.registerAction('lockConstraint', "Lock Constraint", function () {
    app.viewer.parametricManager.lock(app.viewer.selected);
  });

  this.registerAction('pointOnLine', "Point On Line", function () {
    app.viewer.parametricManager.pointOnLine(app.viewer.selected);
  });

  this.registerAction('pointOnArc', "Point On Arc / Ellipse", function () {
    app.viewer.parametricManager.pointOnArc(app.viewer.selected);
  });
  
  this.registerAction('pointInMiddle', "Point In the Middle", function () {
    app.viewer.parametricManager.pointInMiddle(app.viewer.selected);
  });

  this.registerAction('llAngle', "Angle Between 2 Lines", function () {
    app.viewer.parametricManager.llAngle(app.viewer.selected, prompt);
  });
  
  this.registerAction('symmetry', "Symmetry", function () {
    app.viewer.parametricManager.symmetry(app.viewer.selected, prompt);
  });
  this.registerAction('lockConvex', "Lock Convexity", function () {
    app.viewer.parametricManager.lockConvex(app.viewer.selected, alert);
  });
  
  this.registerAction('analyzeConstraint', "Analyze Constraint", function () {
    app.viewer.parametricManager.analyze(alert);
  });

  this.registerAction('solve', "Solve System", function () {
    app.viewer.parametricManager.solve();
    app.viewer.refresh();
  });

  this.registerAction('CLEAN UP', "Clean All Draw", function () {
    app.cleanUpData();
    app.viewer.refresh();
  });

  this.registerAction('fit', "Fit Sketch On Screen", function () {
    app.fit();
    app.viewer.refresh();
  });

  this.registerAction('genSerpinski', "Generate Serpinki Triangle off of a segment", function () {
    genSerpinski(app.viewer);
  });

}

App2D.views = [
  {
    name: 'Dimensions',
    icon: 'arrows-v'
  },
  {
    name: 'Properties',
    icon: 'sliders'
  },
  {
    name: 'Constraints',
    icon: 'cogs'
  },
  {
    name: 'Mirroring',
    icon: 'mirror'
  }
];

App2D.prototype.fit = function() {

  var bbox = new BBox();
  
  for (var l = 0; l < this.viewer.layers.length; ++l) {
    var layer = this.viewer.layers[l];
    for (var i = 0; i < layer.objects.length; ++i) {
      var obj = layer.objects[i];
      bbox.check(obj);
    }
  }
  if (!bbox.isValid()) {
    return;
  }
  var bounds = bbox.bbox;
  this.viewer.showBounds(bounds[0], bounds[1], bounds[2], bounds[3]);
  bbox.inc(20 / this.viewer.scale);
  this.viewer.showBounds(bounds[0], bounds[1], bounds[2], bounds[3]);
};

App2D.prototype.cloneSketch = function() {
  var name = prompt("Name for sketch clone");
  if (name != null) {
    if (this.isSketchExists(name)) {
      alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
      return;
    }
    localStorage.setItem(App2D.STORAGE_PREFIX + name, this.viewer.io.serializeSketch());
    this.openSketch(name);
  }
};

App2D.prototype.isSketchExists = function(name) {
  return localStorage.getItem(App2D.STORAGE_PREFIX + name) != null;
};

App2D.prototype.openSketch = function(name) {
  var uri = window.location.href.split("#")[0];
  if (name !== "untitled") {
    uri += "#" + name;
  }
  var win = window.open(uri, '_blank');
  win.focus();
};

App2D.prototype.newSketch = function() {
  var name = prompt("Name for sketch");
  if (name != null) {
    if (this.isSketchExists(name)) {
      alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
      return;
    }
    this.openSketch(name);
  }
};

App2D.prototype.initSketchManager = function(data, ext) {
  this._sketchesWin = new ui.Window($('#sketchManager'), this.winManager);
  var app = this;
  var sketchesList = new ui.List('sketchList', {
    items : function() {
      var theItems = [];
      for (var name in localStorage) {
        if (!localStorage.hasOwnProperty(name)) {
          continue;
        }
        if (name.indexOf(App2D.STORAGE_PREFIX) === 0) {
          name = name.substring(App2D.STORAGE_PREFIX.length);
        }
        theItems.push({name : name});
      }
      return theItems;
    },

    remove : function(item) {
      if (confirm("Selected sketch will be REMOVED! Are you sure?")) {
        localStorage.removeItem(App2D.STORAGE_PREFIX + item.name);
        sketchesList.refresh();
      }
    },

    mouseleave : function(item) {},
    hover : function(item) {},

    click : function(item) {
      app.openSketch(item.name);
    }
  });
  $('#sketchManager').find('.content').append(sketchesList.ul);
  sketchesList.refresh();
  this._sketchesList = sketchesList;
};

App2D.prototype.loadFromLocalStorage = function() {
  var sketchId = this.getSketchId();
  var sketchData = localStorage.getItem(sketchId);
  if (sketchData != null) {
    this.viewer.historyManager.init(sketchData);
    this.viewer.io.loadSketch(sketchData);
  }
  this.viewer.repaint();
};

App2D.prototype.getSketchId = function() {
  var id = window.location.hash.substring(1);
  if (!id) {
    id = "untitled";
  }
  return App2D.STORAGE_PREFIX + id;
};

App2D.prototype.bindToolsToTerminal = function() {
  const toolCommandProcessor = (command) => this.viewer.toolManager.tool.processCommand(command);
  this.viewer.bus.subscribe('tool-change', () => {
    var tool = this.viewer.toolManager.tool;
    this.terminalHandler = tool.processCommand ? toolCommandProcessor : undefined;
    $('.tool-info').text('tool: ' + tool.name);
    $('.tool-hint').text('');
  })();
  this.viewer.bus.subscribe('tool-message', (message) => {
    this.terminal.print(message);
  });
  this.viewer.bus.subscribe('tool-hint', (message) => {
    this.terminal.print(message);
    $('.tool-hint').text(message);
  });
};

App2D.STATIC_COMMANDS = {
  "time" : () => new Date(),
  "help" : (app) => app.getAllCommandList().join(", ")
};

App2D.prototype.getAllCommandList = function() {
  const commands = Object.keys(this.commands);
  commands.push.apply(commands, Object.keys(App2D.STATIC_COMMANDS));
  commands.sort();
  return commands;
};

App2D.prototype.handleTerminalInput = function(commandStr) {
  commandStr = commandStr.trim();
  if (this.terminalHandler) {
    return this.terminalHandler(commandStr);
  } else {
    let cmd = App2D.STATIC_COMMANDS[commandStr];
    if (cmd) {
      return cmd(this);
    }
    let actionId = this.commands[commandStr];
    if (actionId) {
      this.actions[actionId].action();
    } else {
      try {
        return eval(commandStr);
      } catch(e) {
      }
    }
  }
};

function createAppContext(viewer) {
  return {
    viewer,
    ui: {
      $constraintEditRequest: stream()
    }
  };
}

App2D.STORAGE_PREFIX = "TCAD.projects.";

export default App2D;

