import * as SceneGraph from 'scene/sceneGraph';
import ControlPointObject3D from './controlPointObject';

export default function spatialCurveEditor(workGroup, viewer, frames) {

  function init() {
    frames.forEach(addPoint);
  }


  function addPoint(pCsys) {
    SceneGraph.addToGroup(workGroup, new ControlPointObject3D(pCsys, viewer));
    viewer.requestRender();
  }
  
  function dispose() {
    
  }
  
  init();

  return {
    dispose
  }
}


