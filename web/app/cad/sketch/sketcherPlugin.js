import {ReadSketch} from './sketchReader';
import {getSketchBoundaries} from './sketchBoundaries';
import {state, stream} from 'lstream';
import {InPlaceSketcher} from './inPlaceSketcher';
import sketcherUIContrib from './sketcherUIContrib';
import initReassignSketchMode from './reassignSketchMode';
import sketcherStreams from '../../sketcher/sketcherStreams';
import {Viewer} from "../../sketcher/viewer2d";
import {IO} from "../../sketcher/io";
import {DelegatingPanTool} from "../../sketcher/tools/pan";

export function defineStreams(ctx) {
  ctx.streams.sketcher = {
    update: stream(),
    sketchingFace: state(null)
  };
  ctx.streams.sketcher.sketchingMode = ctx.streams.sketcher.sketchingFace.map(face => !!face);
}

export function activate(ctx) {
  
  let {streams, services} = ctx;
  
  sketcherUIContrib(ctx);
  
  const onSketchUpdate = evt => {
    let prefix = services.project.sketchStorageNamespace;
    if (evt.key.indexOf(prefix) < 0) return;
    let sketchFaceId = evt.key.substring(prefix.length);
    let sketchFace = services.cadRegistry.findFace(sketchFaceId);
    if (sketchFace) {
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

  function getSketchData(sketchId) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    return services.storage.get(sketchStorageKey);
  }
  
  function setSketchData(sketchId, data) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    return services.storage.set(sketchStorageKey, data);
  }

  function removeSketchData(sketchId) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    return services.storage.remove(sketchStorageKey);
  }

  const headlessCanvas = document.createElement('canvas');
  document.createElement('div').appendChild(headlessCanvas);

  function readSketch(sketchId) {
    let savedSketch = getSketchData(sketchId);
    if (savedSketch === null) {
      return null;
    }

    let signature = services.expressions.signature;
    if (savedSketch && (!savedSketch.metadata || savedSketch.expressionsSignature !== signature)) {
      try {
        const viewer = new Viewer(headlessCanvas, IO);
        viewer.parametricManager.externalConstantResolver = services.expressions.evaluateExpression;
        viewer.historyManager.init(savedSketch);
        viewer.io.loadSketch(savedSketch);
        viewer.parametricManager.refresh();
        services.storage.set(services.project.sketchStorageKey(sketchId), viewer.io.serializeSketch({
          expressionsSignature: signature
        }), true);
        savedSketch = getSketchData(sketchId);
      } catch (e) {
        console.error(e);
        return null;
      }
    }


    try {
      return ReadSketch(JSON.parse(savedSketch), sketchId, true);  
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function hasSketch(sketchId) {
    let sketchStorageKey = services.project.sketchStorageKey(sketchId);
    return !!services.storage.get(sketchStorageKey);
  }

  function updateSketchForFace(mFace) {
    let sketch = readSketch(mFace.defaultSketchId);
    mFace.setSketch(sketch);
    streams.sketcher.update.next(mFace);
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

  let inPlaceEditor = new InPlaceSketcher(ctx);
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
  
  function reassignSketch(fromId, toId) {
    let sketchData = getSketchData(fromId);
    if (!sketchData) {
      return;
    }
    setSketchData(toId, sketchData);
    removeSketchData(fromId);
    updateSketchForFace(services.cadRegistry.findFace(fromId));
    updateSketchForFace(services.cadRegistry.findFace(toId));
    services.viewer.requestRender();
  }
  
  streams.craft.models.attach(updateAllSketches);
  streams.craft.models.attach(() => {
    if (inPlaceEditor.inEditMode) {
      if (!inPlaceEditor.face.ext.view) {
        inPlaceEditor.exit();
      }
    }
  });
  streams.expressions.table.attach(() => {
    if (inPlaceEditor.viewer !== null) {
      inPlaceEditor.viewer.parametricManager.refresh();
    }
    updateAllSketches();
  });


  services.sketcher = {
    sketchFace, sketchFace2D, updateAllSketches, getAllSketches, readSketch, hasSketch, inPlaceEditor, reassignSketch,
    reassignSketchMode: initReassignSketchMode(ctx)
  }
}
