import SceneSetup from 'scene/sceneSetup';

export default class Viewer {
  
  constructor(container, onRendered) {
    this.sceneSetup = new SceneSetup(container, onRendered);
    this.renderRequested = false;
  }
  
  render() {
    this.sceneSetup.render();  
  }

  requestRender = () => {
    if (this.renderRequested) {
      return;
    }
    setTimeout(() => {
      this.renderRequested = false;
      this.render();
    });
  };
  
  setVisualProp = (obj, prop, value) => {
    if (obj[prop] !== value) {
      obj[prop] = value;
      this.requestRender();
    }
  };
  
  lookAt(obj) {
    this.sceneSetup.lookAt(obj);
  }
  
  raycast(event, objects) {
    return this.sceneSetup.raycast(event, objects);
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
}

export const CAMERA_MODE = {
  ORTHOGRAPHIC: 'ORTHOGRAPHIC',
  PERSPECTIVE: 'PERSPECTIVE'  
};

