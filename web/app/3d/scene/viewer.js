import SceneSetup from 'scene/sceneSetup';

export default class Viewer {
  
  constructor(container) {
    this.sceneSetup = new SceneSetup(container);
  }
  
  render() {
    this.sceneSetup.render();  
  }

  lookAt(obj) {
    this.sceneSetup.lookAt(obj);
  }
  
  raycast(event, group) {
    return this.sceneSetup.raycast(event, group);
  }
  
  setCameraMode() {
    
  }
  
}

