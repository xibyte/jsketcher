import * as mask from 'gems/mask'
import {getAttribute} from '../../../../../modules/scene/objectData';
import {TOKENS as UI_TOKENS} from '../../dom/uiEntryPointsPlugin';
import {FACE, EDGE, SKETCH_OBJECT} from '../entites';

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3)
};

const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT];

export function activate(context) {
  initStateAndServices(context);
  let domElement = context.services.viewer.sceneSetup.domElement();
  
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

  function selected(key, object) {
    let selection = context.bus.state[key];
    return selection !== undefined && selection.indexOf(object) !== -1;
  }

  function handlePick(event) {
    raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE, (object, kind) => {
      if (kind === PICK_KIND.FACE) {
        if (!selected('selection_face', object.id)) {
          context.services.cadScene.showBasis(object.basis(), object.depth());
          context.bus.dispatch('selection_face', [object.id]);
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (!selected('selection_sketchObject', object.id)) {
          context.bus.dispatch('selection_sketchObject', [object.id]);
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (dispatchSelection('selection_edge', object.id, event)) {
          return false;
        }
      }
      return true;
    });
  }

  function dispatchSelection(selectionToken, selectee, event) {
    if (selected(selectionToken, selectee)) {
      return false;
    }
    let multiMode = event.shiftKey;
    context.bus.updateState(selectionToken, selection => multiMode ? [...selection, selectee] : [selectee]);
    return true;
  }
  
  function handleSolidPick(e) {
    raycastObjects(e, PICK_KIND.FACE, (sketchFace) => {
      context.bus.dispatch('selection_solid', sketchFace.solid);
      context.services.viewer.render();
      return false;
    });
  }

  function raycastObjects(event, kind, visitor) {
    let pickResults = context.services.viewer.raycast(event, context.services.cadScene.workGroup);
    const pickers = [
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.SKETCH) && pickResult.object instanceof THREE.Line &&
          pickResult.object.__TCAD_SketchObject !== undefined) {
          return !visitor(pickResult.object, PICK_KIND.SKETCH);
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.EDGE)) {
          let cadEdge = getAttribute(pickResult.object, 'edge');
          if (cadEdge) {
            return !visitor(cadEdge, PICK_KIND.EDGE);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.FACE) && !!pickResult.face) {
          let sketchFace = getAttribute(pickResult.face, 'face');
          if (sketchFace) {
            return !visitor(sketchFace, PICK_KIND.FACE);
          }
        }
        return false;
      },
    ];
    for (let i = 0; i < pickResults.length; i++) {
      const pickResult = pickResults[i];
      for (let picker of pickers) {
        if (picker(pickResult)) {
          return;
        }
      }
    }
  }
}

function initStateAndServices({bus, services}) {
  
  services.selection = {
  };

  SELECTABLE_ENTITIES.forEach(entity => {
    let entitySelectApi = {
      objects: [],
      single: undefined
    };
    services.selection[entity] = entitySelectApi;
    let selType = entitySelectionToken(entity);
    bus.enableState(selType, []);
    bus.subscribe(selType, selection => {
      entitySelectApi.objects = selection.map(id => services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0]; 
    });
    entitySelectApi.select = selection => bus.dispatch(selType, selection);
  });
}

const selectionTokenMap = {};
SELECTABLE_ENTITIES.forEach(e => selectionTokenMap[e] = `selection_${e}`);

export function entitySelectionToken(entity) {
  let token = selectionTokenMap[entity];
  if (!token) {
    throw "entity isn't selectable " + entity;
  }
  return token;
}

  




