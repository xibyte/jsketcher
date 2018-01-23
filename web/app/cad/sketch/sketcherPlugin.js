
import {createToken} from "../../../../modules/bus/index";
import {ReadSketch} from "./sketchReader";
import {getSketchBoundaries} from "./sketchBoundaries";

export function activate({bus, services}) {

  services.storage.addListener(evt => {
    let prefix = services.project.sketchStorageNamespace;
    if (evt.key.indexOf(prefix) < 0) return;
    let sketchFaceId = evt.key.substring(prefix.length);
    let sketchFace = services.cadRegistry.findFace(sketchFaceId);
    if (sketchFace !== null) {
      let sketch = readSketch(sketchFace.id);
      sketchFace.updateSketch(sketch);
      bus.dispatch(TOKENS.SKETCH_UPDATE, sketchFace.id);
      services.viewer.render();
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
  
  services.sketcher = {
    sketchFace
  }
  
}

export const TOKENS = {
  SKETCH_UPDATE: createToken('sketcher', 'sketchUpdate')
};
