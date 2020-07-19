import {DATUM, DATUM_AXIS, EDGE, FACE, LOOP, SHELL, SKETCH_OBJECT} from '../scene/entites';
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

  function findShell(shellId) {
    let shells = getAllShells();
    for (let shell of shells) {
      if (shell.id === shellId) {
        return shell;
      }
    }
    return null;
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

  function findDatumAxis(datumAxisId) {
    const [datumId, axisLiteral] = datumAxisId.split('/');  
    let datum = streams.cadRegistry.modelIndex.value.get(datumId);
    if (!datum) {
      return null;
    }
    return datum.getAxisByLiteral(axisLiteral);
  }
  
  function findLoop(loopId) {
    let [shellId, faceId, loopLocalId] = loopId.split('/');
    let face = findFace(shellId+'/'+faceId);
    if (face) {
      for (let loop of face.sketchLoops) {
        if (loop.id === loopId) {
          return loop;
        }
      }
    }
    return null;
  }

  function findEntity(entity, id) {
    switch (entity) {
      case FACE: return findFace(id);
      case SHELL: return findShell(id);
      case EDGE: return findEdge(id);
      case SKETCH_OBJECT: return findSketchObject(id);
      case DATUM: return findDatum(id);
      case DATUM_AXIS: return findDatumAxis(id);
      case LOOP: return findLoop(id);
      default: throw 'unsupported';
    }
  }
  
  services.cadRegistry = {
    getAllShells, findShell, findFace, findEdge, findSketchObject, findEntity, findDatum, findDatumAxis, findLoop,
    get modelIndex() {
      return streams.cadRegistry.modelIndex.value;
    },
    get models() {
      return streams.craft.models.value;
    },
    get shells() {
      return getAllShells();
    }
  }
}


