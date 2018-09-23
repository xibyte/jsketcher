import Viewer, {CAMERA_MODE} from './viewer';
import CadScene from "./cadScene";
import {externalState} from '../../../../modules/lstream';
import {InPlaceSketcher} from '../sketch/inPlaceSketcher';

export function activate({streams, services}) {
  let {dom} = services;
  
  let viewer = new Viewer(dom.viewerContainer);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);

  streams.cadScene = {
    cameraMode: externalState(() => viewer.getCameraMode(), mode => viewer.setCameraMode(mode))
  };
  
  // let sketcher3D = new Sketcher3D(dom.viewerContainer);
  // services.viewer.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);
  
}
