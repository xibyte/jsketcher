import 'ui/styles/global/index.less';
import '../css/app.less'

import {createAppContext} from './sketcher/sketcherContext';
import {Constraints} from './sketcher/parametric'

import ReactDOM from "react-dom";
import {SketcherApp} from "./sketcher/components/SketcherApp";
import React from "react";
import {loadUIState, saveUIState} from "./sketcher/uiState";
import {Scope} from "./sketcher/components/Scope";
import {createElement} from "./utils/domUtils";
import {SKETCHER_STORAGE_PREFIX} from "./sketcher/project";
import {Dock, dockBtn} from "./sketcher/components/Dock";
import {DIRECTIONS, ResizeHelper} from "ui/components/Window";
import {getSketcherAction} from "./sketcher/actions";
import {initShortkeys} from "./sketcher/shortkeys";

function initializeSketcherApplication() {

  const context = createAppContext();
  const dock = initNonReactUIParts(context);
  initShortkeys(context);

  window.__CAD_APP = context;

  const sketchId = context.project.getSketchId();
  context.project.loadFromLocalStorage();
  context.viewer.fit();

  // Auto-save every 30 seconds
  setInterval(() => {
    try {
      const sketchData = context.viewer.io.serializeSketch();
      const sketchId = context.project.getSketchId();
      localStorage.setItem(sketchId, sketchData);
    } catch(e) { /* silent */ }
  }, 30000);


  const constraintsView = dock.views['Constraints'];
  constraintsView.node.append(createElement("div", "constraint-list"));
  dock.views['Properties'].node.append(createElement("div", "properties-view"));
  dock.views['Dimensions'].node.append(createElement("div", "dimension-view"));

  loadUIState(dock);

  window.addEventListener("beforeunload", () => {
    saveUIState(dock);
  });

  startReact(context);
}

function initNonReactUIParts(context) {

  const AppDockViews = [
    {
      name: 'Properties',
      icon: 'sliders'
    },
    {
      name: 'Constraints',
      icon: 'cogs'
    },
    {
      name: 'Dimensions',
      icon: 'arrows-v'
    }
  ];

  //Keep all legacy UI artifacts here.

  const dockEl = document.getElementById('dock');
  const statusToolGroup = document.getElementById('status-tool-group');
  const dock = new Dock(dockEl, statusToolGroup, AppDockViews);
  dock.show('Constraints');

  const resizeHelper = new ResizeHelper(true);
  resizeHelper.registerResize(dockEl, DIRECTIONS.WEST, 5, () => document.body.dispatchEvent(new Event('layout')));

  document.body.addEventListener('layout', context.viewer.onWindowResize);

  const consoleBtn = dockBtn('Commands', 'list');
  statusToolGroup.appendChild(consoleBtn);

  consoleBtn.addEventListener('click', () => {
    getSketcherAction('ToggleTerminal').invoke(context);
  });
  context.ui.$showTerminalRequest.attach(show => {
    if (show) {
      consoleBtn.classList.add('selected');
    } else {
      consoleBtn.classList.remove('selected');
    }
  });

  const coordInfo = document.querySelector('.coordinates-info');
  context.viewer.canvas.addEventListener('mousemove', e => {
    const coord = context.viewer.screenToModel(e);
    coordInfo.innerText = context.viewer.roundToPrecision(coord.x) + " : " + context.viewer.roundToPrecision(coord.y);
  });

  // Update zoom display
  const zoomInfo = document.querySelector('.zoom-info');
  if (zoomInfo) {
    context.viewer.streams.zoom && context.viewer.streams.zoom.$change.attach && context.viewer.streams.zoom.$change.attach(z => {
      zoomInfo.innerText = Math.round(z * 100) + '%';
    });
  }

  atatchToToolStreams(context);
  return dock;
}

function atatchToToolStreams(context) {

  context.viewer.streams.tool.$change.attach(tool => {
    document.querySelectorAll('.tool-info').forEach(e => e.innerText = tool.name);
    document.querySelectorAll('.tool-hint').forEach(e => e.innerText = '');
  });

  context.viewer.streams.tool.$message.attach((message) => {
    context.printToTerminal(message);
  });
  context.viewer.streams.tool.$hint.attach((message) => {
    context.printToTerminal(message);
    document.querySelectorAll('.tool-hint').forEach(e => e.innerText = message);
  });
}


function startReact(appCtx) {

  const reactControls = document.getElementById('react-controls');
  ReactDOM.render(
    <Scope><SketcherApp applicationContext={appCtx} /></Scope>,
    reactControls
  );
}

window.addEventListener('DOMContentLoaded', () => initializeSketcherApplication());
