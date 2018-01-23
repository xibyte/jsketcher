
import {createToken} from '../../../../modules/bus/index';
import {ReadSketch} from './sketchReader';
import {getSketchBoundaries} from './sketchBoundaries';
import {TOKENS as CRAFT_TOKENS} from '../craft/craftPlugin';

export function activate({bus, services}) {

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
  
  function readSketch(sketchId) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    let savedSketch = services.storage.get(sketchStorageKey);
    if (savedSketch === null) {
      return null;
    }
    return ReadSketch(JSON.parse(savedSketch), sketchId, true);
  }
  
  function updateSketchForFace(sketchFace) {
    let sketch = readSketch(sketchFace.id);
    if (sketch !== null) {
      sketchFace.updateSketch(sketch);
      bus.dispatch(TOKENS.SKETCH_UPDATE, sketchFace.id);
    }
  }

  function updateAllSketches() {
    let allShells = services.cadRegistry.getAllShells();
    allShells.forEach(sceneShell => sceneShell.sceneFaces.forEach(sceneFace => updateSketchForFace(sceneFace)));
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
  
  bus.subscribe(CRAFT_TOKENS.DID_MODIFY, updateAllSketches);
  
  services.sketcher = {
    sketchFace, updateAllSketches
  }
}

export const TOKENS = {
  SKETCH_UPDATE: createToken('sketcher', 'sketchUpdate')
};
