import Viewer from './viewer';
import CadScene from './cadScene';
import {externalState, stream} from 'lstream';
import {ApplicationContext} from "context";

export function defineStreams({streams, services}) {
  streams.cadScene = {
    sceneRendered: stream(),
    cameraMode: externalState(() => services.viewer.getCameraMode(), mode => services.viewer.setCameraMode(mode))
  };
}

export function activate(ctx: ApplicationContext) {
  const {streams, services} = ctx;
  let {dom} = services;
  
  const onRendered = () => streams.cadScene.sceneRendered.next(); 
  
  let viewer = new Viewer(dom.viewerContainer, onRendered);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  ctx.viewer = viewer;
  ctx.cadScene = services.cadScene;



  let showMenu = true;
  dom.viewerContainer.addEventListener('mousedown', (e) => {
    showMenu = true;
  });

  dom.viewerContainer.addEventListener('mousemove', (e) => {
    showMenu = false;
  });

  dom.viewerContainer.addEventListener('mouseup', (e) => {
    if (showMenu) {
    ctx.actionService.run('menu.contextual', {
        x: e.offsetX,
        y: e.offsetY
      })
    }
  }, false);

  // let sketcher3D = new Sketcher3D(dom.viewerContainer);
  // services.viewer.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);

  document.addEventListener('contextmenu', e => {
    // @ts-ignore
    if (e.target.closest('#viewer-container')) {
      e.preventDefault();
    }
  });

}

export function dispose(ctx) {
  ctx.services.viewer.dispose();
}


declare module 'context' {
  interface ApplicationContext {

    cadScene: CadScene;
    viewer: Viewer;
  }
}
