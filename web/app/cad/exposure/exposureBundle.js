import exposure from './exposure';
import {MBrepShell} from '../model/mshell';

export const BundleName = "@Exposure";

/*
 * exposure stands for the Test Program Interface
 */
export function activate({streams, services}) {

  function addShellOnScene(shell, skin) {
    const sceneSolid = new MBrepShell(shell);
    addOnScene(sceneSolid, skin);
    return sceneSolid;
  }
  function addOnScene(sceneSolid, skin) {
    streams.craft.models.next([sceneSolid]);
    services.viewer.render();
  }
  services.exposure = Object.assign({
    streams,
    services,
    addShellOnScene,
    addOnScene
  }, exposure);
}