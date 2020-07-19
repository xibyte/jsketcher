import Vector, {AXIS, ORIGIN} from 'math/vector';
import {RiCamera2Line} from "react-icons/ri";

const NEG_X = AXIS.X.negate();
const NEG_Y = AXIS.Y.negate();
const NEG_Z = AXIS.Z.negate();
const DIR_3_WAY_VIEW =  new Vector(1, 1, 1).normalize();
const DIR_3_WAY_BACK_VIEW =  new Vector(-1, 1, -1).normalize();

function lookAtFace(viewer, face, currFace) {
  let dist = currFace ? currFace.csys.origin.distanceTo(viewer.sceneSetup.camera.position) : undefined;
  viewer.lookAt(face.csys.origin, face.csys.z, face.csys.y, dist);
  viewer.requestRender();
}

function faceAt(shells, shell, pos) {
  let shellIndex = shells.indexOf(shell);
  if (pos >= shell.faces.length) {
    let i = shellIndex;
    do {
      i = (i + 1) % shells.length;
      shell = shells[i]; 
    } while(shellIndex !== i && shell.faces.length === 0);
    return shell.faces[0];
  } else if (pos < 0) {
    let i = shellIndex;
    do {
      i = (i - 1 + shells.length) % shells.length;
      shell = shells[i];
    } while(shellIndex !== i && shell.faces.length === 0);
    return shell.faces[shell.faces.length - 1];
  } else {
    return shell.faces[pos];  
  }
}

function getCurrentSelectedOrFirstFace(ctx) {
  let face = ctx.services.selection.face.single;
  if (!face) {
    for (let shell of ctx.services.cadRegistry.shells) {
      if (shell.faces.length !== 0) {
        return shell.faces[0]; 
      }
    }
  }
  return face;
}

export default [
  {
    id: 'ZoomIn',
    invoke: ctx => {
      ctx.services.viewer.zoomIn();
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'ZoomOut',
    invoke: ctx => {
      ctx.services.viewer.zoomOut();
      ctx.services.viewer.requestRender();
    }
  },  
  {
    id: 'LookAtFace',
    appearance: {
      icon: RiCamera2Line,
      info: 'move camera to show selected face',
      label: 'Look at'
    },

    invoke: ctx => {
      let face = ctx.services.selection.face.single;
      if (face) {
        lookAtFace(ctx.services.viewer, face);
      }
    }
  },
  {
    id: 'CycleFacesNext',
    invoke: ctx => {
      let face = getCurrentSelectedOrFirstFace(ctx);
      if (face) {
        let index = face.shell.faces.indexOf(face);
        let nextFace = faceAt(ctx.services.cadRegistry.shells, face.shell, index + 1);
        ctx.services.pickControl.pick(nextFace);
        lookAtFace(ctx.services.viewer, nextFace, face);
      }
    }
  },
  {
    id: 'CycleFacesPrev',
    invoke: ctx => {
      let face = getCurrentSelectedOrFirstFace(ctx);
      if (face) {
        let index = face.shell.faces.indexOf(face);
        let prevFace = faceAt(ctx.services.cadRegistry.shells, face.shell, index - 1);
        ctx.services.pickControl.pick(prevFace);
        lookAtFace(ctx.services.viewer, prevFace, face);
      }
    }
  },
  {
    id: 'StandardViewFront',
    appearance: {
      label: 'front'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, AXIS.Z, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardViewBack',
    appearance: {
      label: 'back'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, NEG_Z, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardViewLeft',
    appearance: {
      label: 'left'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, NEG_X, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardViewRight',
    appearance: {
      label: 'right'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, AXIS.X, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardViewTop',
    appearance: {
      label: 'top'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, AXIS.Y, NEG_Z, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardViewBottom',
    appearance: {
      label: 'bottom'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, NEG_Y, AXIS.Z, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardView3Way',
    appearance: {
      label: 'three way'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, DIR_3_WAY_VIEW, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'StandardView3WayBack',
    appearance: {
      label: 'three way back'
    },
    invoke: ctx => {
      ctx.services.viewer.lookAt(ORIGIN, DIR_3_WAY_BACK_VIEW, AXIS.Y, ctx.services.viewer.sceneSetup.camera.position.length());
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'HistoryBackward',
    invoke: ctx => ctx.services.craft.historyTravel.backward({
      noWizardFocus: true
    })
  },
  {
    id: 'HistoryForward',
    invoke: ctx => ctx.services.craft.historyTravel.forward({
      noWizardFocus: true
    })
  },
]