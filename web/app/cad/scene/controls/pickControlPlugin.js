import * as mask from 'gems/mask'
import {getAttribute, setAttribute} from '../../../../../modules/scene/objectData';
import {FACE, EDGE, SKETCH_OBJECT} from '../entites';
import {state} from '../../../../../modules/lstream';

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3)
};

const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT];

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
    raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE, (object, kind) => {
      if (kind === PICK_KIND.FACE) {
        if (!selected(streams.selection.face, object.id)) {
          services.cadScene.showBasis(object.basis(), object.depth());
          streams.selection.face.next([object.id]);
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (!selected(streams.selection.sketchObject, object.id)) {
          streams.selection.sketchObject.next([object.id]);
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (dispatchSelection(streams.selection.edge, object.id, event)) {
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
    let pickResults = services.viewer.raycast(event, services.cadScene.workGroup);
    const pickers = [
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.SKETCH) && pickResult.object instanceof THREE.Line) {
          let sketchObject = getAttribute(pickResult.object, 'sketchObject');
          if (sketchObject) {
            return !visitor(sketchObject, PICK_KIND.SKETCH);
          }
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

function initStateAndServices({streams, services}) {
  
  services.selection = {
  };

  streams.selection = {
  };
  
  SELECTABLE_ENTITIES.forEach(entity => {
    let entitySelectApi = {
      objects: [],
      single: undefined
    };
    services.selection[entity] = entitySelectApi;
    let selectionState = state([]);
    streams.selection[entity] = selectionState;
    selectionState.attach(selection => {
      entitySelectApi.objects = selection.map(id => services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0]; 
    });
    entitySelectApi.select = selection => selectionState.value = selection;
  });
}





