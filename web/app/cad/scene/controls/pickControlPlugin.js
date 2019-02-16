import * as mask from 'gems/mask'
import {getAttribute, setAttribute} from 'scene/objectData';
import {FACE, EDGE, SKETCH_OBJECT, DATUM, SHELL, DATUM_AXIS, LOOP} from '../entites';
import {LOG_FLAGS} from '../../logFlags';

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

export function activate(context) {
  const {services, streams} = context;

  const defaultHandler = (model, event, rayCastData) => {
    if (LOG_FLAGS.PICK) {
      printPickInfo(model, rayCastData);
    }
    const type = model.TYPE;
    let selectionMode = DEFAULT_SELECTION_MODE;
    let modelId = model.id;
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

  let pickHandler = defaultHandler;
  
  let domElement = services.viewer.sceneSetup.domElement();
  
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);

  let mouseState = {
    startX: 0,
    startY: 0
  };

  function mousedown(e) {
    mouseState.startX = e.offsetX;
    mouseState.startY = e.offsetY;
  }

  function mouseup(e) {
    let dx = Math.abs(mouseState.startX - e.offsetX);
    let dy = Math.abs(mouseState.startY - e.offsetY);
    let TOL = 1;
    if (dx < TOL && dy < TOL) {
      if (e.button !== 0) {
        handleSolidPick(e);
      } else {
        handlePick(e);
      }
    }
  }

  function setPickHandler(handler) {
    pickHandler = handler || defaultHandler;
    services.marker.clear();
  }

  const deselectAll = () => services.marker.clear();

  function handlePick(event) {
    raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE | PICK_KIND.DATUM_AXIS | PICK_KIND.LOOP, pickHandler);
  }

  function pick(obj) {
    pickHandler(obj, null);
  }
  
  function dispatchSelection(entityType, selectee, event) {
    let marker = services.marker;
    if (marker.isMarked(selectee)) {
      return false;
    }
    let multiMode = event && event.shiftKey;
    
    if (multiMode) {
      marker.markAdding(entityType, selectee)
    } else {
      marker.markExclusively(entityType, selectee)
    }
    return true;
  }
  
  function handleSolidPick(e) {
    raycastObjects(e, PICK_KIND.FACE, (sketchFace) => {
      streams.selection.solid.next([sketchFace.solid]);
      services.viewer.render();
      return false;
    });
  }

  function raycastObjects(event, kind, visitor) {
    let pickResults = services.viewer.raycast(event, services.cadScene.workGroup.children);
    const pickers = [
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.SKETCH)) {
          let sketchObjectV = getAttribute(pickResult.object, SKETCH_OBJECT);
          if (sketchObjectV) {
            return !visitor(sketchObjectV.model, event, pickResult);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.EDGE)) {
          let edgeV = getAttribute(pickResult.object, EDGE);
          if (edgeV) {
            return !visitor(edgeV.model, event, pickResult);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.LOOP) && !!pickResult.face) {
          let faceV = getAttribute(pickResult.face, LOOP);
          if (faceV) {
            return !visitor(faceV.model, event, pickResult);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.FACE) && !!pickResult.face) {
          let faceV = getAttribute(pickResult.face, FACE);
          if (faceV) {
            return !visitor(faceV.model, event, pickResult);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.DATUM_AXIS)) {
          let datumAxisV = getAttribute(pickResult.object, DATUM_AXIS);
          if (datumAxisV) {
            return !visitor(datumAxisV.model, event, pickResult);
          }
        }
        return false;
      },
    ];
    for (let i = 0; i < pickResults.length; i++) {
      const pickResult = pickResults[i];
      for (let picker of pickers) {
        if (pickResult.object && pickResult.object.passRayCast && pickResult.object.passRayCast(pickResults)) {
          // continue;
        }
        if (picker(pickResult)) {
          return;
        }
      }
    }
  }
  services.pickControl = {
    setPickHandler, deselectAll, pick
  };
}

function printPickInfo(model, rayCastData) {
  console.log("PICKED MODEL:");
  console.dir(model);
  console.log("PICK RAYCAST INFO:");
  console.dir(rayCastData);
  let pt = rayCastData.point;
  console.log('POINT: ' + pt.x + ', ' + pt.y + ',' + pt.z);
}