import {getSketchBoundaries} from './sketchBoundaries';
import {state, stream} from 'lstream';
import {InPlaceSketcher} from './inPlaceSketcher';
import sketcherUIContrib from './sketcherUIContrib';
import initReassignSketchMode from './reassignSketchMode';
import {Viewer} from "sketcher/viewer2d";
import {IO} from "sketcher/io";
import {Generator} from "sketcher/id-generator";
import {MFace} from "cad/model/mface";

export function defineStreams(ctx) {
  ctx.streams.sketcher = {
    update: stream(),
    sketchingFace: state(null),
    sketcherAppContext: state(null)
  };
  ctx.streams.sketcher.sketchingMode = ctx.streams.sketcher.sketcherAppContext.map(ctx => !!ctx);
}

export function activate(ctx) {
  
  const {streams, services} = ctx;
  
  sketcherUIContrib(ctx);
  
  const onSketchUpdate = evt => {
    const prefix = ctx.projectService.sketchStorageNamespace;
    if (evt.key.indexOf(prefix) < 0) return;
    const sketchFaceId = evt.key.substring(prefix.length);
    const sketchFace = services.cadRegistry.findFace(sketchFaceId);
    if (sketchFace) {
      updateSketchForFace(sketchFace);
      services.viewer.requestRender();
    }
  };

  services.storage.addListener(onSketchUpdate);

  const headlessCanvas = document.createElement('canvas');
  document.createElement('div').appendChild(headlessCanvas);

  function reevaluateAllSketches() {
    const allShells = services.cadRegistry.getAllShells();
    allShells.forEach(mShell => mShell.faces.forEach(mFace => reevaluateSketch(mFace.defaultSketchId)));
  }

  function reevaluateSketch(sketchId) {
    const savedSketch = ctx.sketchStorageService.getSketchData(sketchId);
    if (savedSketch === null) {
      return null;
    }

    let sketch;
    try {
      sketch = JSON.parse(savedSketch);
    } catch (e) {
      console.error(e);
      return null;
    }

    const signature = ctx.expressionService.signature;
    if (sketch && (!sketch.metadata || sketch.metadata.expressionsSignature !== signature)) {
      try {
        const viewer = new Viewer(headlessCanvas, IO, {});
        viewer.parametricManager.externalConstantResolver = ctx.expressionService.evaluateExpression;
        // viewer.historyManager.init(savedSketch);
        viewer.io._loadSketch(sketch);
        viewer.parametricManager.refresh();
        services.storage.set(ctx.projectService.sketchStorageKey(sketchId), viewer.io.serializeSketch({
          expressionsSignature: signature
        }));
        Generator.resetIDGenerator();
      } catch (e) {
        console.error(e);
        return null;
      }
    }
  }

  function exportFaceToDXF(sceneFace) {
    const sketchId = sceneFace.id;
    updateSketchBoundaries(sceneFace);

    const savedSketch = ctx.sketchStorageService.getSketchData(sketchId);

    if (savedSketch === null) {
      return null;
    }

    let sketch;
    try {
      sketch = JSON.parse(savedSketch);
    } catch (e) {
      console.error(e);
      return null;
    }

    if (sketch) {
      try {
        const viewer = new Viewer(headlessCanvas, IO, {});

        viewer.parametricManager.externalConstantResolver = ctx.expressionService.evaluateExpression;
        // viewer.historyManager.init(savedSketch);
        viewer.io._loadSketch(sketch);
        IO.exportTextData(viewer.io.dxfExport(), ctx.projectService.id + "_" + sketchId + ".dxf");
        Generator.resetIDGenerator();
      } catch (e) {
        console.error(e);
        return null;
      }
    }
  }

  ctx.craftService.models$.attach(models => models.forEach(model => model.traverse(m => {
    if (m instanceof MFace) {
      if (!m.ext.sketchInitialized) {
        m.ext.sketchInitialized = true;
        updateSketchForFace(m);
      }
    }
  })));

  function updateSketchForFace(mFace) {
    const sketch = ctx.sketchStorageService.readSketch(mFace.defaultSketchId);
    mFace.setSketch(sketch);
    ctx.cadRegistry.reindexFace(mFace);
    streams.sketcher.update.next(mFace); // updates UI face views
  }

  function updateAllSketches() {
    const allShells = services.cadRegistry.getAllShells();
    allShells.forEach(mShell => mShell.faces.forEach(mFace => updateSketchForFace(mFace)));
    services.viewer.requestRender();
  }
  
  function updateSketchBoundaries(sceneFace) {
    
    const sketchStorageKey = ctx.projectService.sketchStorageKey(sceneFace.id);

    const sketch = services.storage.get(sketchStorageKey);

    const data = sketch === null ? {} : JSON.parse(sketch);

    data.boundary = getSketchBoundaries(sceneFace);
    services.storage.set(sketchStorageKey, JSON.stringify(data));
  }

  const inPlaceEditor = new InPlaceSketcher(ctx);
  function sketchFace(face) {
    updateSketchBoundaries(face);
    if (inPlaceEditor.inEditMode) {
      inPlaceEditor.exit();
    }
    inPlaceEditor.enter(face);
  }
  
  function sketchFace2D(face) {
    updateSketchBoundaries(face);
    const sketchURL = ctx.projectService.getSketchURL(face.id);
    ctx.appTabsService.show(face.id, 'Sketch ' + face.id, 'sketcher.html#' + sketchURL);
  }
  
  function reassignSketch(fromId, toId) {
    const sketchData = ctx.sketchStorageService.getSketchData(fromId);
    if (!sketchData) {
      return;
    }
    ctx.sketchStorageService.setSketchData(toId, sketchData);
    ctx.sketchStorageService.removeSketchData(fromId);
    updateSketchForFace(services.cadRegistry.findFace(fromId));
    updateSketchForFace(services.cadRegistry.findFace(toId));
    services.viewer.requestRender();
  }
  
  streams.craft.models.attach(() => {
    if (inPlaceEditor.inEditMode) {
      if (!inPlaceEditor.face.ext.view) {
        inPlaceEditor.exit();
      }
    }
  });
  ctx.expressionService.table$.attach(() => {
    if (inPlaceEditor.viewer !== null) {
      inPlaceEditor.viewer.parametricManager.refresh();
    }
    reevaluateAllSketches();
  });


  services.sketcher = {
    sketchFace, sketchFace2D, updateAllSketches, inPlaceEditor, reassignSketch,
    exportFaceToDXF,
    reassignSketchMode: initReassignSketchMode(ctx)
  };
  ctx.sketcherService = services.sketcher;
}

export interface SketcherService {

}


export interface SketcherBundleContext {

  sketcherService: SketcherService;
}

export const BundleName = "@Sketcher";
