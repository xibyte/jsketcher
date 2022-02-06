import {DelegatingPanTool} from '../../sketcher/tools/pan';
import {Matrix4} from 'three/src/math/Matrix4';
import {CAMERA_MODE} from '../scene/viewer';
import DPR from 'dpr';
import {SKETCHER_MODE_HEADS_UP_ACTIONS} from "./sketcherUIContrib";
import {createEssentialAppContext} from "../../sketcher/sketcherContext";
import {STANDARD_MODE_HEADS_UP_TOOLBAR} from "../part/uiConfigPlugin";
import {ORIGIN} from "math/vector";

export class InPlaceSketcher {
  
  constructor(ctx) {
    this.face = null; // should be only one in the state
    this.ctx = ctx;
    this.sketcherAppContext = null;
  }

  get viewer() {
    return this.sketcherAppContext ? this.sketcherAppContext.viewer : null;
  }

  get inEditMode() {
    return !!this.face    
  }
  
  enter(face, headless) {
    let viewer3d = this.ctx.services.viewer;
    this.face = face;
    this.face.ext.view.sketchGroup.visible = false;
    viewer3d.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);
    viewer3d.render(); // updates camera projection matrix
    
    let container = viewer3d.sceneSetup.container;
    let canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.right = 0;
    canvas.style.bottom = 0;

    container.appendChild(canvas);
    this.sketcherAppContext = createEssentialAppContext(canvas);
    this.viewer.parametricManager.externalConstantResolver = this.ctx.expressionService.evaluateExpression;

    this.syncWithCamera();
    this.viewer.toolManager.setDefaultTool(new DelegatingPanTool(this.viewer, viewer3d.sceneSetup.renderer.domElement));
    viewer3d.sceneSetup.trackballControls.addEventListener( 'change', this.onCameraChange);

    this.ctx.streams.ui.toolbars.headsUp.next(SKETCHER_MODE_HEADS_UP_ACTIONS);
    this.ctx.streams.ui.toolbars.headsUpShowTitles.next(false);

    let sketchData = this.ctx.services.storage.get(this.sketchStorageKey);
    this.viewer.historyManager.init(sketchData);
    this.viewer.io.loadSketch(sketchData);
    this.ctx.streams.sketcher.sketchingFace.next(face);
    this.ctx.streams.sketcher.sketcherAppContext.next(this.sketcherAppContext);
  }

  get sketchStorageKey() {
    return this.ctx.projectService.sketchStorageKey(this.face.defaultSketchId);
  }

  exit() {
    if (this.face.ext.view) {
      this.face.ext.view.sketchGroup.visible = true;
    }
    let viewer3d = this.ctx.services.viewer;
    viewer3d.sceneSetup.trackballControls.removeEventListener( 'change', this.onCameraChange);
    this.face = null;
    this.viewer.canvas.parentNode.removeChild(this.viewer.canvas);
    this.viewer.dispose();
    this.sketcherAppContext = null;
    this.ctx.streams.sketcher.sketchingFace.next(null);
    this.ctx.streams.sketcher.sketcherAppContext.next(null);
    this.ctx.streams.ui.toolbars.headsUp.next(STANDARD_MODE_HEADS_UP_TOOLBAR);
    this.ctx.streams.ui.toolbars.headsUpShowTitles.next(true);
    viewer3d.requestRender();
  }

  onCameraChange = () => {
    this.syncWithCamera();
    this.viewer.refresh();
  };

  syncWithCamera() {
    let face = this.face;
    let sceneSetup = this.ctx.services.viewer.sceneSetup;
    
    _projScreenMatrix.multiplyMatrices( sceneSetup.oCamera.projectionMatrix,
      sceneSetup.oCamera.matrixWorldInverse );

    let csys = face.csys;

    // let sketchToWorld = face.sketchToWorldTransformation;
    // let sketchOrigin = sketchToWorld.apply(ORIGIN);
    // let basisX = sketchToWorld.apply(AXIS.X);
    // let basisY = sketchToWorld.apply(AXIS.Y);

    let sketchOrigin = csys.origin;
    let basisX = csys.x;
    let basisY = csys.y;

    let o = ORIGIN.three().applyMatrix4(_projScreenMatrix);
    let xx = basisX.three().applyMatrix4(_projScreenMatrix);
    let yy = basisY.three().applyMatrix4(_projScreenMatrix);

    let sketchOriginDelta = sketchOrigin.three().applyMatrix4(_projScreenMatrix);

    let width = sceneSetup.container.clientWidth * DPR / 2;
    let height = sceneSetup.container.clientHeight * DPR /2;

    xx.sub(o);
    yy.sub(o);

    this.viewer.setTransformation(xx.x * width, xx.y * height, yy.x * width, yy.y* height,
      (sketchOriginDelta.x) * width + width,
      (sketchOriginDelta.y) * height + height, sceneSetup.oCamera.zoom);
  };
  
  save() {
    this.ctx.services.storage.set(this.sketchStorageKey, this.viewer.io.serializeSketch({
      expressionsSignature: this.ctx.expressionService.signature
    }));
  }
}

let _projScreenMatrix = new Matrix4();