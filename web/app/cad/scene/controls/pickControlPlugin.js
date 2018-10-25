import * as mask from 'gems/mask'
import {getAttribute, setAttribute} from 'scene/objectData';
import {FACE, EDGE, SKETCH_OBJECT, DATUM} from '../entites';
import {state} from 'lstream';

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3)
};

const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT, DATUM];

export function activate(context) {
  const {services, streams} = context;
  initStateAndServices(context);
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

  function selected(selection, object) {
    return selection.value.indexOf(object) !== -1;
  }

  function handlePick(event) {
    raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE, (view, kind) => {
      let modelId = view.model.id;
      if (kind === PICK_KIND.FACE) {
        if (dispatchSelection(streams.selection.face, modelId, event)) {
          services.cadScene.showBasis(view.model.basis(), view.model.depth());
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (dispatchSelection(streams.selection.sketchObject, modelId, event)) {
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (dispatchSelection(streams.selection.edge, modelId, event)) {
          return false;
        }
      }
      return true;
    });
  }

  function dispatchSelection(selection, selectee, event) {
    if (selected(selection, selectee)) {
      return false;
    }
    let multiMode = event.shiftKey;
    selection.update(value => multiMode ? [...value, selectee] : [selectee]);
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
        if (mask.is(kind, PICK_KIND.SKETCH) && pickResult.object instanceof THREE.Line) {
          let sketchObjectV = getAttribute(pickResult.object, SKETCH_OBJECT);
          if (sketchObjectV) {
            return !visitor(sketchObjectV, PICK_KIND.SKETCH);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.EDGE)) {
          let edgeV = getAttribute(pickResult.object, EDGE);
          if (edgeV) {
            return !visitor(edgeV, PICK_KIND.EDGE);
          }
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.FACE) && !!pickResult.face) {
          let faceV = getAttribute(pickResult.face, FACE);
          if (faceV) {
            return !visitor(faceV, PICK_KIND.FACE);
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

export function defineStreams({streams}) {
  streams.selection = {
  };
  SELECTABLE_ENTITIES.forEach(entity => {
    streams.selection[entity] = state([]);
  });
}

function initStateAndServices({streams, services}) {

  services.selection = {};

  SELECTABLE_ENTITIES.forEach(entity => {
    let entitySelectApi = {
      objects: [],
      single: undefined
    };
    services.selection[entity] = entitySelectApi;
    let selectionState = streams.selection[entity];
    selectionState.attach(selection => {
      entitySelectApi.objects = selection.map(id => services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0];
    });
    entitySelectApi.select = selection => selectionState.value = selection;
  });

  streams.craft.models.attach(() => {
    withdrawAll(streams.selection)
  });
}

export function withdrawAll(selectionStreams) {
  Object.values(selectionStreams).forEach(stream => stream.next([]))
}
