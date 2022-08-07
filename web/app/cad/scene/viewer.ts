import {Emitter, externalState, state, StateStream, stream} from "lstream";
import SceneSetUp from "scene/sceneSetup";

export enum ViewMode {
  WIREFRAME = 'WIREFRAME',
  SHADED = 'SHADED',
  SHADED_WITH_EDGES = 'SHADED_WITH_EDGES'
}

export default class Viewer {

  sceneRendered$: Emitter<any> = stream();
  cameraMode$: StateStream<any>;
  viewMode$: StateStream<ViewMode> = state(ViewMode.SHADED_WITH_EDGES);

  sceneSetup: SceneSetUp;

  constructor(container, onRendered) {

    this.cameraMode$ = externalState(() => this.getCameraMode(), mode => this.setCameraMode(mode))

    this.sceneSetup = new SceneSetUp(container, onRendered);
  }
  
  render() {
    this.requestRender();
  }

  requestRender = () => {
    this.sceneSetup.requestRender();
  };
  
  setVisualProp = (obj, prop, value) => {
    if (obj[prop] !== value) {
      obj[prop] = value;
      this.requestRender();
    }
  };

  lookAtObject(obj) {
    this.sceneSetup.lookAtObject(obj);
  }
  
  raycast(event, objects, logInfoOut) {
    return this.sceneSetup.raycast(event, objects, logInfoOut);
  }
  
  customRaycast(from3, to3, objects) {
    return this.sceneSetup.customRaycast(from3, to3, objects);
  }
  
  setCameraMode(mode) {
    if (this.getCameraMode() === mode) {
      return;
    }
    if (mode === CAMERA_MODE.PERSPECTIVE) {
      this.sceneSetup.setCamera(this.sceneSetup.pCamera);
    } else {
      this.sceneSetup.setCamera(this.sceneSetup.oCamera);
    }
  }

  getCameraMode() {
    return this.sceneSetup.camera === this.sceneSetup.pCamera ? CAMERA_MODE.PERSPECTIVE : CAMERA_MODE.ORTHOGRAPHIC;
  }
  
  toggleCamera() {
    if (this.getCameraMode() === CAMERA_MODE.PERSPECTIVE) {
      this.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);
    } else {
      this.setCameraMode(CAMERA_MODE.PERSPECTIVE);
    }
  }
  
  zoomIn() {
    this.sceneSetup.trackballControls.zoomStep(1, -5);
  }

  zoomOut() {
    this.sceneSetup.trackballControls.zoomStep(1, 5);
  }

  lookAt(target, normal, up, dist) {
    let obj = this.sceneSetup.trackballControls.object;
    if (up) {
      obj.up.copy(up);
    }
    if (dist === undefined) {
      dist = target.distanceTo(obj.position);
    }
    obj.position.copy(target);
    obj.position.addScaledVector(normal, dist);
    this.sceneSetup.trackballControls.target.copy(target);
    this.sceneSetup.trackballControls.update();
  }

  dispose() {
    this.sceneSetup.renderer.dispose();
  }
}

export const CAMERA_MODE = {
  ORTHOGRAPHIC: 'ORTHOGRAPHIC',
  PERSPECTIVE: 'PERSPECTIVE'  
};

