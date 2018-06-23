
import {ReadSketch} from './sketchReader';
import {getSketchBoundaries} from './sketchBoundaries';
import {TOKENS as CRAFT_TOKENS} from '../craft/craftPlugin';
import {stream} from 'lstream';

export function activate({streams, services}) {

  streams.sketcher = {
    update: stream()
  };
  
  services.storage.addListener(evt => {
    let prefix = services.project.sketchStorageNamespace;
    if (evt.key.indexOf(prefix) < 0) return;
    let sketchFaceId = evt.key.substring(prefix.length);
    let sketchFace = services.cadRegistry.findFace(sketchFaceId);
    if (sketchFace !== null) {
      updateSketchForFace(sketchFace);
      services.viewer.requestRender();
    }
  });

  function getAllSketches() {
    let nm = services.project.sketchStorageNamespace;
    return services.storage.getAllKeysFromNamespace(nm).map(fqn => ({
      fqn, id: fqn.substring(nm.length)
    }));
  }

  function readSketch(sketchId) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    let savedSketch = services.storage.get(sketchStorageKey);
    if (savedSketch === null) {
      return null;
    }
    return ReadSketch(JSON.parse(savedSketch), sketchId, true);
  }
  
  function updateSketchForFace(mFace) {
    let sketch = readSketch(mFace.id);
    if (sketch !== null) {
      mFace.setSketch(sketch);
      streams.sketcher.update.next(mFace);
    }
  }

  function updateAllSketches() {
    let allShells = services.cadRegistry.getAllShells();
    allShells.forEach(mShell => mShell.faces.forEach(mFace => updateSketchForFace(mFace)));
    services.viewer.requestRender();
  }
  
  function updateSketchBoundaries(sceneFace) {
    
    let sketchStorageKey = services.project.sketchStorageKey(sceneFace.id);

    let sketch = services.storage.get(sketchStorageKey);

    let data = sketch === null ? {} : JSON.parse(sketch);

    data.boundary = getSketchBoundaries(sceneFace);
    services.storage.set(sketchStorageKey, JSON.stringify(data));
  }

  
  function sketchFace(sceneFace) {
    updateSketchBoundaries(sceneFace);
    let sketchURL = services.project.getSketchURL(sceneFace.id);
    services.appTabs.show(sceneFace.id, 'Sketch ' + sceneFace.id, 'sketcher.html#' + sketchURL);
  }
  
  streams.craft.modifications.attach(updateAllSketches);
  
  services.sketcher = {
    sketchFace, updateAllSketches, getAllSketches, readSketch
  }
}
