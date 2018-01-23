import {createToken} from "../../../../modules/bus/index";
import * as SceneGraph from 'scene/sceneGraph';

export function activate({bus, services}) {

  let registry = new Map();
  
  function getAllShells() {
    return Array.from(registry.values());
  }

  function update(toRemove, toAdd) {
    if (toRemove) {
      toRemove.forEach(shell => {
        registry.delete(shell.tCadId);
        SceneGraph.removeFromGroup(services.cadScene.workGroup, shell.cadGroup);
        shell.dispose();
      });
    }
    if (toAdd) {
      toAdd.forEach(shell => {
        registry.set(shell.tCadId, shell);
        SceneGraph.addToGroup(services.cadScene.workGroup, shell.cadGroup);
      });
    }
    services.viewer.render();
    bus.dispatch(TOKENS.SHELLS, registry);
  }
  
  function reset() {
    SOLIDS_COUNTER = 0;
    update(getAllShells());
  }

  function findFace(faceId) {
    let shells = getAllShells();
    for (let shell of shells) {
      for (let face of shell.sceneFaces) {
        if (face.id === faceId) {
          return face;
        }
      }
    }
    return null;
  }

  services.cadRegistry = {
    getAllShells, update, reset, findFace
  }
}


export const TOKENS = {
  SHELLS: createToken('cadRegistry', 'shells'),
};

let SOLIDS_COUNTER = 0;
export function genSolidId() {
  return SOLIDS_COUNTER ++
}
