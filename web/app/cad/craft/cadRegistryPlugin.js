import {EDGE, FACE, SKETCH_OBJECT} from '../scene/entites';


export function activate({streams, services}) {

  streams.cadRegistry = {
    shellIndex: streams.craft.models.map(models => models.reduce((i, v)=> i.set(v.id, v), new Map())).keep() 
  };

  streams.cadRegistry.update = streams.cadRegistry.shellIndex;
  
  function getAllShells() {
    return streams.craft.models.value;
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

  function findEntity(entity, id) {
    switch (entity) {
      case FACE: return findFace(id);
      case EDGE: return findEdge(id);
      case SKETCH_OBJECT: return findSketchObject(id);
      default: throw 'unsupported';
    }
  }
  
  services.cadRegistry = {
    getAllShells, findFace, findEdge, findSketchObject, findEntity,
    get shellIndex() {
      return streams.cadRegistry.shellIndex.value;
    }
  }
}


