import * as mask from 'gems/mask'
import {getAttribute} from 'scene/objectData';
import {DATUM, DATUM_AXIS, EDGE, FACE, LOOP, SHELL, SKETCH_OBJECT} from 'cad/model/entities';
import {LOG_FLAGS} from 'cad/logFlags';
import {initRayCastDebug, printRaycastDebugInfo, RayCastDebugInfo} from "./rayCastDebug";
import {PickListDialog, PickListDialogRequest$} from "cad/scene/controls/PickListDialog";
import {MObject} from "cad/model/mobject";
import {MFace} from "cad/model/mface";
import {MOpenFaceShell} from "cad/model/mopenFace";
import {nextNumber} from "gems/numberGenerator";
import {NOOP} from "gems/func";

export type PickControlToken = number;

export type PickHandler = (model, event, rayCastData?) => boolean;

export interface PickControlService {

  takePickControl(pickHandler: PickHandler, syncMarkers: SyncMarkersCallback): PickControlToken;

  releasePickControl(controlToken: PickControlToken);

  deselectAll()

  pick()

  pickFromRay()

  simulatePickFromRay()
}

export interface PickControlBundleContext {
  pickControlService: PickControlService;
}

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3),
  DATUM: mask.type(4),
  DATUM_AXIS: mask.type(5),
  LOOP: mask.type(6)
};

const DEFAULT_SELECTION_MODE = Object.freeze({
  shell: false,
  vertex: false,
  face: true,
  edge: true,
  sketchObject: true,
  datum: true  
});

type SyncMarkersCallback = () => void;

interface PickContext {
  pickHandler: PickHandler;
  token: PickControlToken;
  syncMarkers: SyncMarkersCallback
}

export const ALL_EXCLUDING_SOLID_KINDS = PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE | PICK_KIND.DATUM_AXIS | PICK_KIND.LOOP;
export const ALL_POSSIBLE_KIND = Number.MAX_SAFE_INTEGER;
export function activate(context) {
  const {services} = context;

  context.domService.contributeComponent(PickListDialog);

  const defaultHandler: PickHandler = (model, event, rayCastData?) => {
    if (LOG_FLAGS.PICK) {
      printPickInfo(model, rayCastData);
    }
    const type = model.TYPE;
    const selectionMode = DEFAULT_SELECTION_MODE;
    const modelId = model.id;
    if (type === FACE) {
      if (selectionMode.shell) {
        if (dispatchSelection(SHELL, model.shell.id, event)) {
          return false;
        }
      } else {
        if (dispatchSelection(FACE, modelId, event)) {
          services.cadScene.showGlobalCsys(model.csys);
          return false;
        }
      }
    } else if (type === SHELL) {
      if (dispatchSelection(SHELL, modelId, event)) {
        return false;
      }
    } else if (type === SKETCH_OBJECT) {
      if (dispatchSelection(SKETCH_OBJECT, modelId, event)) {
        return false;
      }
    } else if (type === EDGE) {
      if (dispatchSelection(EDGE, modelId, event)) {
        return false;
      }
    } else if (type === DATUM) {
      if (dispatchSelection(DATUM, modelId, event)) {
        return false;
      }
    }
    return true;
  };

  const defaultPickContext: PickContext = {
    pickHandler: defaultHandler,
    token: -1,
    syncMarkers: NOOP
  };

  let pickContext: PickContext = defaultPickContext;
  let contextStack = [];
  
  const domElement = services.viewer.sceneSetup.domElement();
  
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);
  domElement.addEventListener('dblclick', mousedblclick, false);
  document.addEventListener('mousemove', mousemove, false);

  const mouseState = {
    startX: 0,
    startY: 0
  };

  let timeoutId = null;
  let pickListDialogMode = false;

  function mousemove(e) {
    if (pickListDialogMode) {
      context.domService.setCursor(null);
      pickListDialogMode = false;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      pickListDialogMode = true;
      context.domService.setCursor('crosshair');
    }, 500);
  }

  function mousedown(e) {
    mouseState.startX = e.offsetX;
    mouseState.startY = e.offsetY;
  }

  function mouseup(e) {
    const dx = Math.abs(mouseState.startX - e.offsetX);
    const dy = Math.abs(mouseState.startY - e.offsetY);
    const TOL = 1;
    if (dx < TOL && dy < TOL) {
      if (e.button !== 0) {
        // handleSolidPick(e);
      } else {
        handlePick(e);
      }
    }
  }

  function mousedblclick(e) {
    // handleSolidPick(e);
  }

  function clickaway() {
    PickListDialogRequest$.next(null);
    domElement.removeEventListener('click', clickaway, false);
  }

  function takePickControl(handler, syncMarkers): PickControlToken {
    const token = nextNumber('PickControlToken');
    pickContext = {
      pickHandler: handler,
      token: token,
      syncMarkers
    };
    services.marker.clear();
    contextStack.push(pickContext);
    return token;
  }

  function releasePickControl(token) {
    contextStack = contextStack.filter(ctrl => ctrl.token != token);
    pickContext = contextStack[0] || defaultPickContext
    pickContext.syncMarkers();
  }

  const deselectAll = () => {
    if (pickContext !== defaultPickContext) {
      console.info("deselect all cannot be used in current context");
    }
    services.marker.clear();
  }

  function handlePick(event) {
    const pickResults = services.viewer.raycast(event, services.cadScene.workGroup.children, RayCastDebugInfo);
    if (pickListDialogMode) {
      const capture = new Set<MObject>();
      traversePickResults(event, pickResults, ALL_POSSIBLE_KIND, (model) => {
        if (!(model.parent instanceof MOpenFaceShell)) {
          capture.add(model);
        }
        if (model instanceof MFace) {
          capture.add(model.shell);
        }
        return true;
      });
      PickListDialogRequest$.next({
        x: event.offsetX,
        y: event.offsetY,
        token: Date.now(),
        capture: Array.from(capture)
      });
      setTimeout(() => domElement.addEventListener('click', clickaway, false), 100);
      return;
    }
    traversePickResults(event, pickResults, ALL_EXCLUDING_SOLID_KINDS, pickContext.pickHandler);
  }

  function pickFromRay(from3, to3, kind, event = null) {
    const pickResults = services.viewer.customRaycast(from3, to3, services.cadScene.workGroup.children);
    return traversePickResults(event, pickResults, kind, pickContext.pickHandler);
  }

  function simulatePickFromRay(from3, to3, event = null) {
    return pickFromRay(from3, to3, ALL_EXCLUDING_SOLID_KINDS, event);
  }

  function pick(obj, event = null) {
    pickContext.pickHandler(obj, event);
  }
  
  function dispatchSelection(entityType, selectee, event) {
    const marker = services.marker;
    if (marker.isMarked(selectee)) {
      marker.withdraw(selectee);
      return true;
    }
    const multiMode = event && event.shiftKey;
    
    if (multiMode) {
      marker.markAdding(entityType, selectee)
    } else {
      marker.markExclusively(entityType, selectee)
    }
    return true;
  }
  
  function handleSolidPick(e) {
    const pickResults = services.viewer.raycast(e, services.cadScene.workGroup.children);
    traversePickResults(e, pickResults, PICK_KIND.FACE, (sketchFace) => {
      const shell = sketchFace.shell;
      services.marker.markExclusively(shell.TYPE, shell.id);
      // context.locationService.edit(shell);
      return false;
    });
  }
  
  services.pickControl = {
    takePickControl, releasePickControl, deselectAll, pick, pickFromRay, simulatePickFromRay
  };

  context.pickControlService = services.pickControl;

  if (LOG_FLAGS.PICK) {
    initRayCastDebug();
  }
  initRayCastDebug();
}

export function traversePickResults(event, pickResults, kind, visitor) {
  const pickers = [
    (pickResult) => {
      if (mask.is(kind, PICK_KIND.SKETCH)) {
        const sketchObjectV = getAttribute(pickResult.object, SKETCH_OBJECT);
        if (sketchObjectV) {
          return !visitor(sketchObjectV.model, event, pickResult);
        }
      }
      return false;
    },
    (pickResult) => {
      if (mask.is(kind, PICK_KIND.EDGE)) {
        const edgeV = getAttribute(pickResult.object, EDGE);
        if (edgeV) {
          return !visitor(edgeV.model, event, pickResult);
        }
      }
      return false;
    },
    (pickResult) => {
      if (mask.is(kind, PICK_KIND.LOOP)) {
        const faceV = getAttribute(pickResult.object, LOOP);
        if (faceV) {
          return !visitor(faceV.model, event, pickResult);
        }
      }
      return false;
    },
    (pickResult) => {
      if (mask.is(kind, PICK_KIND.FACE)) {
        const faceV = getAttribute(pickResult.object, FACE);
        if (faceV) {
          return !visitor(faceV.model, event, pickResult);
        }
      }
      return false;
    },
    (pickResult) => {
      if (mask.is(kind, PICK_KIND.DATUM_AXIS)) {
        const datumAxisV = getAttribute(pickResult.object, DATUM_AXIS);
        if (datumAxisV) {
          return !visitor(datumAxisV.model, event, pickResult);
        }
      }
      return false;
    },
  ];
  for (let i = 0; i < pickResults.length; i++) {
    const pickResult = pickResults[i];
    for (const picker of pickers) {
      if (pickResult.object && pickResult.object.passRayCast && pickResult.object.passRayCast(pickResults)) {
        // continue;
      }
      if (picker(pickResult)) {
        return;
      }
    }
  }
}

function printPickInfo(model, rayCastData?) {
  console.log("PICKED MODEL:");
  console.dir(model);
  console.log("PICK RAYCAST INFO:");
  if (rayCastData) {
    console.dir(rayCastData);
    const pt = rayCastData.point;
    console.log('POINT: ' + pt.x + ', ' + pt.y + ',' + pt.z);
    printRaycastDebugInfo('selection', rayCastData);
  }
}

export const BundleName = "@PickControl";