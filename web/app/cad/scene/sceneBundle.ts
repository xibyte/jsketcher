import Viewer from './viewer';
import CadScene from './cadScene';
import {ApplicationContext} from "cad/context";

export function activate(ctx: ApplicationContext) {
  const {services} = ctx;
  const {dom} = services;

  const viewer = new Viewer(dom.viewerContainer);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  ctx.viewer = viewer;
  ctx.cadScene = services.cadScene;

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

export interface SceneBundleContext {

  cadScene: CadScene;
  viewer: Viewer;
}

export const BundleName = "@Scene";