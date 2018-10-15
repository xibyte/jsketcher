import TPI from './tpi';
import {MBrepShell} from '../model/mshell';

/*
 * TPI stands for the Test Program Interface
 */
export function activate({streams, services}) {

  function addShellOnScene(shell, skin) {
    const sceneSolid = new MBrepShell(shell);
    addOnScene(sceneSolid, skin);
    return sceneSolid;
  }
  function addOnScene(sceneSolid, skin) {
    services.cadRegistry.update(null, [sceneSolid]);
    services.viewer.render();
  }
  services.tpi = Object.assign({
    streams,
    services,
    addShellOnScene,
    addOnScene
  }, TPI);
}