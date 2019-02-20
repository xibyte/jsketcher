
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


]