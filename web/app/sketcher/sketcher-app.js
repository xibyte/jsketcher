import {Viewer} from './viewer2d.js'
import * as ui from '../ui/ui'
import {Terminal} from '../ui/terminal'
import {BBox, IO} from './io'
import {InputManager} from './input-manager'
import genSerpinski from '../utils/genSerpinski';
import React from "react";
import {stream} from "../../../modules/lstream";

function App2D() {
  var app = this;

  this.viewer = new Viewer(document.getElementById('viewer'), IO);
  this.context = createAppContext(this.viewer, this);
  this.winManager = new ui.WinManager();
  this.inputManager = new InputManager(this);

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

  this.registerAction('terminal', "Open/Close Terminal Window", function () {
    app.commandsWin.toggle();
    checkForTerminalVisibility();
    app.viewer.refresh();
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



  this.registerAction('solve', "Solve System", function () {
    app.viewer.parametricManager.solve();
    app.viewer.refresh();
  });

  this.registerAction('CLEAN UP', "Clean All Draw", function () {
    app.cleanUpData();
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

function createAppContext(viewer, app) {
  return {
    viewer,
    app,
    ui: {
      $constraintEditRequest: stream(),
      $wizardRequest: stream(),
      $sketchManagerRequest: stream(),
      $exportDialogRequest: stream()
    }
  };
}

App2D.STORAGE_PREFIX = "TCAD.projects.";

export default App2D;

