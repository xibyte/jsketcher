import {ReadSketch} from './sketchReader';
import {getSketchBoundaries} from './sketchBoundaries';
import {state, stream} from 'lstream';
import {InPlaceSketcher} from './inPlaceSketcher';
import {CAMERA_MODE} from '../scene/viewer';
import sketcherUIContrib from './sketcherUIContrib';

export function activate(ctx) {
  
  let {streams, services} = ctx;
  
  sketcherUIContrib(ctx);
  
  streams.sketcher = {
    update: stream(),
    sketchingFace: state(null)
  };

  streams.sketcher.sketchingFace.attach(face => streams.ui.toolbars.sketcherToolbarsVisible.value = !!face);
  
  const onSketchUpdate = evt => {
    let prefix = services.project.sketchStorageNamespace;
    if (evt.key.indexOf(prefix) < 0) return;
    let sketchFaceId = evt.key.substring(prefix.length);
    let sketchFace = services.cadRegistry.findFace(sketchFaceId);
    if (sketchFace !== null) {
      updateSketchForFace(sketchFace);
      services.viewer.requestRender();
    }
  };
  
  services.storage.addListener(onSketchUpdate);

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

  let inPlaceEditor = new InPlaceSketcher(ctx, onSketchUpdate);
  function sketchFace(face) {
    updateSketchBoundaries(face);
    if (inPlaceEditor.inEditMode) {
      inPlaceEditor.exit();
    }
    inPlaceEditor.enter(face);
  }
  
  function sketchFace2D(face) {
    updateSketchBoundaries(face);
    let sketchURL = services.project.getSketchURL(face.id);
    services.appTabs.show(face.id, 'Sketch ' + face.id, 'sketcher.html#' + sketchURL);
  }
  
  streams.craft.models.attach(updateAllSketches);
  
  services.sketcher = {
    sketchFace, sketchFace2D, updateAllSketches, getAllSketches, readSketch, inPlaceEditor
  }
}
