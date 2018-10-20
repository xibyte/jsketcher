import {DATUM, EDGE, FACE, SKETCH_OBJECT} from '../scene/entites';
import {MShell} from '../model/mshell';


export function activate({streams, services}) {

  streams.cadRegistry = {
    shells: streams.craft.models.map(models => models.filter(m => m instanceof MShell)).remember(),
    modelIndex: streams.craft.models.map(models => models.reduce((i, v)=> i.set(v.id, v), new Map())).remember() 
  };

  streams.cadRegistry.update = streams.cadRegistry.modelIndex;
  
  function getAllShells() {
    return streams.cadRegistry.shells.value;
  }
  
  function findFace(faceId) {
    let shells = getAllShells();
    for (let shell of shells) {
      for (let face of shell.faces) {
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
      for (let edge of shell.edges) {
        if (edge.id === edgeId) {
          return edge;
        }
      }
    }
    return null;
  }

  function findSketchObject(sketchObjectGlobalId) {
    let [shellId, faceId, sketchObjectId] = sketchObjectGlobalId.split('/');
    let face = findFace(shellId+'/'+faceId);
    if (face) {
      return face.findSketchObjectById(sketchObjectGlobalId);
    }
    return null;
  }

  function findDatum(datumId) {
    return streams.cadRegistry.modelIndex.value.get(datumId)||null;
  }

  function findEntity(entity, id) {
    switch (entity) {
      case FACE: return findFace(id);
      case EDGE: return findEdge(id);
      case SKETCH_OBJECT: return findSketchObject(id);
      case DATUM: return findDatum(id);
      default: throw 'unsupported';
    }
  }
  
  services.cadRegistry = {
    getAllShells, findFace, findEdge, findSketchObject, findEntity, findDatum,
    get modelIndex() {
      return streams.cadRegistry.modelIndex.value;
    },
    get models() {
      return streams.craft.models.value;
    }
  }
}


