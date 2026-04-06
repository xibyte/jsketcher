import {DelegatingPanTool} from 'sketcher/tools/pan';
import {Matrix4} from 'three/src/math/Matrix4';
import {Vector3} from 'three/src/math/Vector3';
import {CAMERA_MODE} from '../scene/viewer';
import DPR from 'dpr';
import {createEssentialAppContext} from "sketcher/sketcherContext";
import {ORIGIN} from "math/vector";
import {fitSceneToCamera, fitSceneToCameraAnimated, fitFaceToOrthoCamera, animateSketchEntry} from "cad/actions/usabilityActions";
import {Styles} from "sketcher/styles";
import {createFunctionList} from "gems/func";
import {View} from "cad/scene/views/view";

export class InPlaceSketcher {
  
  constructor(ctx) {
    this.face = null; // should be only one in the state
    this.ctx = ctx;
    this.sketcherAppContext = null;
    this.pickControlToken = 0;
    Styles.DEFAULT.strokeStyle = '#3477eb';
  }

  get viewer() {
    return this.sketcherAppContext ? this.sketcherAppContext.viewer : null;
  }

  get inEditMode() {
    return !!this.face    
  }
  
  enter(face, headless) {
    const viewer3d = this.ctx.services.viewer;
    this.face = face;
    this.face.ext.view.sketchGroup.visible = false;

    // Capture perspective camera state before switching modes (for rotation animation)
    const pCam = viewer3d.sceneSetup.pCamera;
    const fromCamPos = pCam.position.clone();
    const fromCamTarget = viewer3d.sceneSetup.trackballControls.target.clone();
    const fromCamUp = pCam.up.clone();

    viewer3d.setCameraMode(CAMERA_MODE.ORTHOGRAPHIC);
    fitFaceToOrthoCamera(viewer3d, face);
    viewer3d.render(); // updates camera projection matrix

    const container = viewer3d.sceneSetup.container;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';

    container.appendChild(canvas);
    this.sketcherAppContext = createEssentialAppContext(canvas);
    this.viewer.parametricManager.externalConstantResolver = this.ctx.expressionService.evaluateExpression;

    this.viewer.toolManager.setDefaultTool(new DelegatingPanTool(this.viewer, viewer3d.sceneSetup.renderer.domElement));
    this.disposers = createFunctionList();

    const cameraListenerDetacher = viewer3d.sceneSetup.sceneRendered$.attach(this.onCameraChange);
    this.disposers.add(cameraListenerDetacher);

    this.ctx.workbenchService.switchWorkbench('sketcher');

    const sketchData = this.ctx.services.storage.get(this.sketchStorageKey);
    this.viewer.historyManager.init(sketchData);
    this.viewer.io.loadSketch(sketchData);
    this.ctx.streams.sketcher.sketchingFace.next(face);
    this.ctx.streams.sketcher.sketcherAppContext.next(this.sketcherAppContext);

    this.pickControlToken = this.ctx.pickControlService.takePickControl(this.sketcherPickControl);

    this.disposers.add(
      this.ctx.viewer.sceneSetup.viewportSizeUpdate$.attach(this.onViewportSizeChange)
    );

    // Force initial sync after all setup is complete, ensuring canvas dimensions
    // and camera matrices are current (mirrors what window resize does)
    this.viewer.onWindowResize();
    this.syncWithCamera();
    animateSketchEntry(viewer3d, face, fromCamPos, fromCamTarget, fromCamUp);
  }

  get sketchStorageKey() {
    return this.ctx.projectService.sketchStorageKey(this.face.defaultSketchId);
  }

  exit() {
    const exitFace = this.face; // save before clearing
    if (this.face.ext.view) {
      try {
        const s = JSON.parse(localStorage.getItem('ForgeCAD.settings') || '{}');
        const hiddenSketches = s.hiddenSketches || [];
        const userHidden = hiddenSketches.includes(this.face.id);
        this.face.ext.view.sketchGroup.visible = !userHidden;
      } catch(e) {
        this.face.ext.view.sketchGroup.visible = true;
      }
    }
    const viewer3d = this.ctx.services.viewer;
    this.face = null;
    this.viewer.canvas.parentNode.removeChild(this.viewer.canvas);
    this.viewer.dispose();
    this.sketcherAppContext = null;
    this.ctx.streams.sketcher.sketchingFace.next(null);
    this.ctx.streams.sketcher.sketcherAppContext.next(null);
    this.ctx.workbenchService.switchToDefaultWorkbench();
    this.disposers.call();
    this.ctx.pickControlService.releasePickControl(this.pickControlToken);
    viewer3d.setCameraMode(CAMERA_MODE.PERSPECTIVE);
    const cz = exitFace.csys.z;
    const cy = exitFace.csys.y;
    const faceNormal = new Vector3(cz.x, cz.y, cz.z);
    const faceUp = new Vector3(cy.x, cy.y, cy.z);
    fitSceneToCamera(viewer3d, this.ctx.services.cadScene.workGroup, faceNormal, faceUp);
    viewer3d.requestRender();
  }

  onCameraChange = () => {
    this.syncWithCamera();
    this.viewer.refresh();
  };

  onViewportSizeChange = () => {
    this.viewer.onWindowResize();
    this.syncWithCamera();
  };

  syncWithCamera() {
    const face = this.face;
    const sceneSetup = this.ctx.services.viewer.sceneSetup;

    sceneSetup.oCamera.lookAt(sceneSetup.trackballControls.target);
    sceneSetup.oCamera.updateMatrixWorld(true);
    _projScreenMatrix.multiplyMatrices( sceneSetup.oCamera.projectionMatrix,
      sceneSetup.oCamera.matrixWorldInverse );

    const csys = face.csys;

    // let sketchToWorld = face.sketchToWorldTransformation;
    // let sketchOrigin = sketchToWorld.apply(ORIGIN);
    // let basisX = sketchToWorld.apply(AXIS.X);
    // let basisY = sketchToWorld.apply(AXIS.Y);

    const sketchOrigin = csys.origin;
    const basisX = csys.x;
    const basisY = csys.y;

    const o = ORIGIN.three().applyMatrix4(_projScreenMatrix);
    const xx = basisX.three().applyMatrix4(_projScreenMatrix);
    const yy = basisY.three().applyMatrix4(_projScreenMatrix);

    const sketchOriginDelta = sketchOrigin.three().applyMatrix4(_projScreenMatrix);

    const width = sceneSetup.container.clientWidth * DPR / 2;
    const height = sceneSetup.container.clientHeight * DPR /2;

    xx.sub(o);
    yy.sub(o);

    this.viewer.setTransformation(xx.x * width, xx.y * height, yy.x * width, yy.y* height,
      (sketchOriginDelta.x) * width + width,
      (sketchOriginDelta.y) * height + height, sceneSetup.oCamera.zoom);
  }
  
  save() {
    this.ctx.services.storage.set(this.sketchStorageKey, this.viewer.io.serializeSketch({
      expressionsSignature: this.ctx.expressionService.signature
    }));
  }

  sketcherPickControl = (obj) => {
    return false;
  }
}

const _projScreenMatrix = new Matrix4();