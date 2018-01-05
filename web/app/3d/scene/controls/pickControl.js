import * as mask from 'gems/mask'

export const PICK_KIND = {
  FACE: mask.type(1),
  SKETCH: mask.type(2),
  EDGE: mask.type(3),
  VERTEX: mask.type(4)
};


export default class PickControl {
  constructor(context) {
    this.context = context;
    let {bus} = context;
    let domElement = context.services.viewer.sceneSetup.domElement();
    bus.enableState('selection:solid', []);
    bus.enableState('selection:face', []);
    bus.enableState('selection:edge', []);
    bus.enableState('selection:sketchObject', []);
    
    this.mouseState = {
      startX: 0,
      startY: 0
    };
    
    domElement.addEventListener('mousedown', this.mousedown, false);
    domElement.addEventListener('mouseup', this.mouseup, false);
  }

  mousedown = e => {
    this.mouseState.startX = e.offsetX;
    this.mouseState.startY = e.offsetY;
  };

  mouseup = e => {
    let dx = Math.abs(this.mouseState.startX - e.offsetX);
    let dy = Math.abs(this.mouseState.startY - e.offsetY);
    let TOL = 1;
    if (dx < TOL && dy < TOL) {
      if (e.button !== 0) {
        this.handleSolidPick(e);
      } else {
        this.handlePick(e);
      }
    }
  };

  selected(key, object) {
    let selection = this.context.bus.state[key];
    return selection !== undefined && selection.indexOf(object) !== -1;
  }
  
  handlePick(event) {
    this.raycastObjects(event, PICK_KIND.FACE | PICK_KIND.SKETCH | PICK_KIND.EDGE, (object, kind) => {
      if (kind === PICK_KIND.FACE) {
        if (!this.selected('selection:face', object)) {
          this.context.bus.dispatch('selection:face', [object]);
          return false;
        }
      } else if (kind === PICK_KIND.SKETCH) {
        if (!this.selected('selection:sketchObject', object)) {
          this.context.bus.dispatch('selection:sketchObject', [object]);
          return false;
        }
      } else if (kind === PICK_KIND.EDGE) {
        if (!this.selected('selection:edge', object)) {
          this.context.bus.dispatch('selection:edge', [object]);
          return false;
        }
      }
      return true;
    });
  }

  handleSolidPick(e) {
    this.raycastObjects(e, PICK_KIND.FACE, (sketchFace) => {
      this.context.bus.dispatch('selection:solid', sketchFace.solid);
      this.context.services.viewer.render();
      return false;
    });
  }

  raycastObjects(event, kind, visitor) {
    let pickResults = this.context.services.viewer.raycast(event, this.context.services.cadScene.workGroup);
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
