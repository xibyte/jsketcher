import {createToken} from "bus";
import * as SceneGraph from 'scene/sceneGraph';
import {EDGE, FACE, SKETCH_OBJECT} from '../scene/entites';


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

  function findEdge(edgeId) {
    let shells = getAllShells();
    for (let shell of shells) {
      for (let edge of shell.sceneEdges) {
        if (edge.id === edgeId) {
          return edge;
        }
      }
    }
    return null;
  }

  function findSketchObject(sketchObjectGlobalId) {
    let [faceId, sketchObjectId] = sketchObjectGlobalId.split('/');
    let face = findFace(faceId);
    if (face) {
      return face.findById(sketchObjectGlobalId);
    }
    return null;
  }

  function findEntity(entity, id) {
    switch (entity) {
      case FACE: return findFace(id);
      case EDGE: return findEdge(id);
      case SKETCH_OBJECT: return findSketchObject(id);
      default: throw 'unsupported';
    }
  }
  
  services.cadRegistry = {
    getAllShells, update, reset, findFace, findEdge, findSketchObject, findEntity
  }
}


export const TOKENS = {
  SHELLS: createToken('cadRegistry', 'shells'),
};

let SOLIDS_COUNTER = 0;
export function genSolidId() {
  return SOLIDS_COUNTER ++
}
