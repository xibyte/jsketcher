import {Viewer} from './viewer2d.js'
import {BBox, IO} from './io'
import {InputManager} from './input-manager'
import React from "react";
import {stream, state} from "lstream";
import {Dock, dockBtn} from "./components/Dock";
import {DIRECTIONS, ResizeHelper} from "../../../modules/ui/components/Window";
import {getAllSketcherActions, getSketcherAction, getSketcherActionIndex} from "./actions";

class App2D {

  constructor() {

    this.viewer = new Viewer(document.getElementById('viewer'), IO);
    this.context = createAppContext(this.viewer, this);
    this.inputManager = new InputManager(this);

    this.initNonReactUIParts();
  }

  get actions() {
    return getSketcherActionIndex();
  }

  fit() {

    const bbox = new BBox();
    this.viewer.accept(obj => {
      bbox.check(obj);
      return true;
    });
    if (!bbox.isValid()) {
      return;
    }

    const bounds = bbox.bbox;
    this.viewer.showBounds(bounds[0], bounds[1], bounds[2], bounds[3]);
    bbox.inc(20 / this.viewer.scale);
    this.viewer.showBounds(bounds[0], bounds[1], bounds[2], bounds[3]);
  }

  cloneSketch() {
    let name = prompt("Name for sketch clone");
    if (name != null) {
      if (this.isSketchExists(name)) {
        alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
        return;
      }
      localStorage.setItem(App2D.STORAGE_PREFIX + name, this.viewer.io.serializeSketch());
      this.openSketch(name);
    }
  }

  isSketchExists(name) {
    return localStorage.getItem(App2D.STORAGE_PREFIX + name) != null;
  }

  openSketch(name) {
    let uri = window.location.href.split("#")[0];
    if (name !== "untitled") {
      uri += "#" + name;
    }
    let win = window.open(uri, '_blank');
    win.focus();
  }

  newSketch() {
    let name = prompt("Name for sketch");
    if (name != null) {
      if (this.isSketchExists(name)) {
        alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
        return;
      }
      this.openSketch(name);
    }
  }

  loadFromLocalStorage() {
    let sketchId = this.getSketchId();
    let sketchData = localStorage.getItem(sketchId);
    if (sketchData != null) {
      this.viewer.historyManager.init(sketchData);
      this.viewer.io.loadSketch(sketchData);
    }
    this.viewer.repaint();
  }

  getSketchId() {
    let id = window.location.hash.substring(1);
    if (!id) {
      id = "untitled";
    }
    return App2D.STORAGE_PREFIX + id;
  }

  printToTerminal(text) {
    this.context.ui.$terminalOutput.mutate(output => output.push({
      text
    }));
  }

  initNonReactUIParts() {

    //Keep all legacy UI artifacts here.

    const dockEl = document.getElementById('dock');
    const bottomButtonGroup = document.querySelector('#status .button-group');
    this.dock = new Dock(dockEl, bottomButtonGroup, AppDockViews);
    this.dock.show('Constraints');

    const resizeHelper = new ResizeHelper(true);
    resizeHelper.registerResize(dockEl, DIRECTIONS.EAST, 5, () => document.body.dispatchEvent(new Event('layout')));

    document.body.addEventListener('layout', this.viewer.onWindowResize);

    const consoleBtn = dockBtn('Commands', 'list');
    bottomButtonGroup.appendChild(consoleBtn);

    consoleBtn.addEventListener('click', () => {
      getSketcherAction('ToggleTerminal').invoke(this.context);
    });
    this.context.ui.$showTerminalRequest.attach(show => {
      if (show) {
        consoleBtn.classList.add('selected');
      } else {
        consoleBtn.classList.remove('selected');
      }
    });

    const coordInfo = document.querySelector('.coordinates-info');
    this.viewer.canvas.addEventListener('mousemove', e => {
      const coord = this.viewer.screenToModel(e);
      coordInfo.innerText = this.viewer.roundToPrecision(coord.x) + " : " + this.viewer.roundToPrecision(coord.y);
    });

    this.atatchToToolStreams();

  }

  atatchToToolStreams() {

    this.viewer.streams.tool.$change.attach(tool => {
      document.querySelectorAll('.tool-info').forEach(e => e.innerText = tool.name);
      document.querySelectorAll('.tool-hint').forEach(e => e.innerText = '');
    });
    this.viewer.streams.tool.$change.attach(tool => {
      document.querySelectorAll('.tool-info').forEach(e => e.innerText = tool.name);
      document.querySelectorAll('.tool-hint').forEach(e => e.innerText = '');
    });

    this.viewer.streams.tool.$message.attach((message) => {
      this.printToTerminal(message);
    });
    this.viewer.streams.tool.$hint.attach((message) => {
      this.printToTerminal(message);
      document.querySelectorAll('.tool-hint').forEach(e => e.innerText = message);
    });
  };
}

const AppDockViews = [
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
  }
];


function createAppContext(viewer, app) {
  return {
    viewer,
    app,
    ui: {
      $constraintEditRequest: stream(),
      $wizardRequest: stream(),
      $sketchManagerRequest: stream(),
      $exportDialogRequest: stream(),
      $showTerminalRequest: state(null),
      $terminalOutput: state([])
    }
  };
}

App2D.STORAGE_PREFIX = "TCAD.projects.";

export default App2D;

