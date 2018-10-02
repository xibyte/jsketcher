import Viewer from './viewer';
import CadScene from './cadScene';
import {externalState, stream} from 'lstream';

export function defineStreams({streams, services}) {
  streams.cadScene = {
    sceneRendered: stream(),
    cameraMode: externalState(() => services.viewer.getCameraMode(), mode => viewer.setCameraMode(mode))
  };
}

export function activate({streams, services}) {
  let {dom} = services;
  
  const onRendered = () => streams.cadScene.sceneRendered.next(); 
  
  let viewer = new Viewer(dom.viewerContainer, onRendered);
  
  services.viewer = viewer;
  services.cadScene = new CadScene(viewer.sceneSetup.rootGroup);
  
  
  // let sketcher3D = new Sketcher3D(dom.viewerContainer);
  // services.viewer.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);
  
}
