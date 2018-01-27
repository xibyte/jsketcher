import TPI from './tpi';
import * as SceneGraph from 'scene/sceneGraph';
import {BREPSceneSolid} from "../scene/wrappers/brepSceneObject";

/*
 * TPI stands for the Test Program Interface
 */
export function activate({services}) {

  function addShellOnScene(shell, skin) {
    const sceneSolid = new BREPSceneSolid(shell, undefined, skin);
    SceneGraph.addToGroup(services.cadScene.workGroup, sceneSolid.cadGroup);
    services.viewer.render();
    return sceneSolid;
  }
  services.tpi = Object.assign({
    addShellOnScene
  }, TPI);
}