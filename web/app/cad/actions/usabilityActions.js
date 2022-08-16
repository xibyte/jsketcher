import Vector, {AXIS, ORIGIN} from 'math/vector';
import {RiCamera2Line} from "react-icons/ri";
import {ViewMode} from "cad/scene/viewer";
import {GiCube, HiCube, HiOutlineCube} from "react-icons/all";

const NEG_X = AXIS.X.negate();
const NEG_Y = AXIS.Y.negate();
const NEG_Z = AXIS.Z.negate();
const DIR_3_WAY_VIEW =  new Vector(1, 1, 1).normalize();
const DIR_3_WAY_BACK_VIEW =  new Vector(-1, 1, -1).normalize();

export function lookAtFace(viewer, face, currFace) {
  const dist = currFace ? currFace.csys.origin.distanceTo(viewer.sceneSetup.camera.position) : undefined;
  viewer.lookAt(face.csys.origin, face.csys.z, face.csys.y, dist);
  viewer.requestRender();
}

function faceAt(shells, shell, pos) {
  const shellIndex = shells.indexOf(shell);
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
  const face = ctx.services.selection.face.single;
  if (!face) {
    for (const shell of ctx.services.cadRegistry.shells) {
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
      const face = ctx.services.selection.face.single;
      if (face) {
        lookAtFace(ctx.services.viewer, face);
      }
    }
  },
  {
    id: 'CycleFacesNext',
    invoke: ctx => {
      const face = getCurrentSelectedOrFirstFace(ctx);
      if (face) {
        const index = face.shell.faces.indexOf(face);
        const nextFace = faceAt(ctx.services.cadRegistry.shells, face.shell, index + 1);
        ctx.services.pickControl.pick(nextFace);
        lookAtFace(ctx.services.viewer, nextFace, face);
      }
    }
  },
  {
    id: 'CycleFacesPrev',
    invoke: ctx => {
      const face = getCurrentSelectedOrFirstFace(ctx);
      if (face) {
        const index = face.shell.faces.indexOf(face);
        const prevFace = faceAt(ctx.services.cadRegistry.shells, face.shell, index - 1);
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
  {
    id: 'ViewMode_WIREFRAME_ON',
    appearance: {
      label: 'wireframe',
      icon: HiOutlineCube,
    },
    invoke: ctx => {
      ctx.services.viewer.viewMode$.next(ViewMode.WIREFRAME);
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'ViewMode_SHADED_ON',
    appearance: {
      label: 'shaded',
      icon: HiCube,
    },
    invoke: ctx => {
      ctx.services.viewer.viewMode$.next(ViewMode.SHADED);
      ctx.services.viewer.requestRender();
    }
  },
  {
    id: 'ViewMode_SHADED_WITH_EDGES_ON',
    appearance: {
      label: 'shaded with edges',
      icon: GiCube,
    },
    invoke: ctx => {
      ctx.services.viewer.viewMode$.next(ViewMode.SHADED_WITH_EDGES);
      ctx.services.viewer.requestRender();
    }
  },
]