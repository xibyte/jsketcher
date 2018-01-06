import * as mask from 'gems/mask'

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3),
  VERTEX: mask.type(4)
};


export function activate(context) {
  let {bus} = context;
  let domElement = context.services.viewer.sceneSetup.domElement();
  bus.enableState('selection_solid', []);
  bus.enableState('selection_face', []);
  bus.enableState('selection_edge', []);
  bus.enableState('selection_sketchObject', []);

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
        if (!selected('selection_face', object)) {
          context.services.cadScene.showBasis(object.basis(), object.depth());
          context.bus.dispatch('selection_face', [object]);
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (!selected('selection_sketchObject', object)) {
          context.bus.dispatch('selection_sketchObject', [object]);
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (!selected('selection_edge', object)) {
          context.bus.dispatch('selection_edge', [object]);
          return false;
        }
      }
      return true;
    });
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
        if (mask.is(kind, PICK_KIND.EDGE) && pickResult.object.__TCAD_EDGE !== undefined) {
          return !visitor(pickResult.object, PICK_KIND.EDGE);
        }
        return false;
      },
      (pickResult) => {
        if (mask.is(kind, PICK_KIND.FACE) && !!pickResult.face && pickResult.face.__TCAD_SceneFace !== undefined) {
          const sketchFace = pickResult.face.__TCAD_SceneFace;
          return !visitor(sketchFace, PICK_KIND.FACE);
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




  




