import Viewer from './viewer';
import CadScene from './cadScene';
import {ApplicationContext} from "cad/context";
import {ViewCube} from "cad/scene/controls/ViewCube";

export function activate(ctx: ApplicationContext) {
  const {services} = ctx;
  const {dom} = services;

  const viewer = new Viewer(dom.viewerContainer);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  ctx.viewer = viewer;
  ctx.cadScene = services.cadScene;

  let showMenu = false;
  dom.viewerContainer.addEventListener('mousedown', (e) => {
    if (e.which == 3 || e.button == 2) {
      showMenu = true;
    }
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

  ctx.domService.contributeComponent(ViewCube);
}

export function dispose(ctx) {
  ctx.services.viewer.dispose();
}

export interface SceneBundleContext {

  cadScene: CadScene;
  viewer: Viewer;
}

export const BundleName = "@Scene";