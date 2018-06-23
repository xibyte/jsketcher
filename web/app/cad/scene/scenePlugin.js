import Viewer from './viewer';
import CadScene from './cadScene';
import {externalState} from '../../../../modules/lstream';

export function activate({streams, services}) {
  let {dom} = services;
  
  let viewer = new Viewer(dom.viewerContainer);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  streams.cadScene = {
    cameraMode: externalState(() => viewer.getCameraMode(), mode => viewer.setCameraMode(mode))
  };
}
