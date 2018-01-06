import Viewer from './viewer';
import CadScene from "./cadScene";

export function activate(context) {
  let {dom} = context.services;
  
  let viewer = new Viewer(dom.viewerContainer);
  
  context.services.viewer = viewer;
  context.services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  context.bus.subscribe('scene:update', () => viewer.render());
}

