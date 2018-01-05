import Viewer from './viewer';
import CadScene from "./cadScene";
import PickControl from "./controls/pickControl";

export function activate(context) {
  context.bus.subscribe('dom:viewerContainer', (container) => {
    initScene(context, container);
  });
}

function initScene(context, container) {
  let viewer = new Viewer(container);
  context.services.viewer = viewer;
  
  context.services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);
  
  let pickControl = new PickControl(context);

  context.bus.subscribe('scene:update', () => viewer.render());
}
