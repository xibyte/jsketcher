import TPI from './tpi';
import * as SceneGraph from 'scene/sceneGraph';
import {BREPSceneSolid} from "../scene/wrappers/brepSceneObject";

/*
 * TPI stands for the Test Program Interface
 */
export function activate({bus, services}) {

  function addShellOnScene(shell, skin) {
    const sceneSolid = new BREPSceneSolid(shell, undefined, skin);
    services.cadRegistry.update(null, [sceneSolid]);
    services.viewer.render();
    return sceneSolid;
  }
  services.tpi = Object.assign({
    bus,
    services,
    addShellOnScene
  }, TPI);
}