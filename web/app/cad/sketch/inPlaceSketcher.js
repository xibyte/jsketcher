import {Viewer} from '../../sketcher/viewer2d';
import {IO} from '../../sketcher/io';
import {DelegatingPanTool} from '../../sketcher/tools/pan';
import {Matrix4} from 'three/src/math/Matrix4';
import {ORIGIN} from '../../math/l3space';
import {CAMERA_MODE} from '../scene/viewer';
import DPR from 'dpr';

export class InPlaceSketcher {
  
  constructor(ctx, onSketchUpdate) {
    this.face = null; // should be only one in the state
    this.ctx = ctx;
    this.onSketchUpdate = onSketchUpdate;
  }

  get inEditMode() {
    return !!this.face    
  }
  
  enter(face) {
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
    this.viewer = new Viewer(canvas, IO);
    this.syncWithCamera();
    this.viewer.toolManager.setDefaultTool(new DelegatingPanTool(this.viewer, viewer3d.sceneSetup.renderer.domElement));
    viewer3d.sceneSetup.trackballControls.addEventListener( 'change', this.onCameraChange);

    let sketchData = localStorage.getItem(this.sketchStorageKey);
    this.viewer.historyManager.init(sketchData);
    this.viewer.io.loadSketch(sketchData);
    this.ctx.streams.sketcher.sketchingFace.value = face;
  }
  
  get sketchStorageKey() {
    return this.ctx.services.project.sketchStorageKey(this.face.id);
  }

  exit() {
    this.face.ext.view.sketchGroup.visible = true;
    let viewer3d = this.ctx.services.viewer;
    viewer3d.sceneSetup.trackballControls.removeEventListener( 'change', this.onCameraChange);
    this.face = null;
    this.viewer.dispose();
    this.viewer.canvas.parentNode.removeChild(this.viewer.canvas);
    this.ctx.streams.sketcher.sketchingFace.value = null;
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

    let [x, y, z] = face.basis();
    let sketchToWorld = face.sketchToWorldTransformation;
    let sketchOrigin = sketchToWorld.apply(ORIGIN);

    let o = ORIGIN.three().applyMatrix4(_projScreenMatrix);
    let xx = x.three().applyMatrix4(_projScreenMatrix);
    let yy = y.three().applyMatrix4(_projScreenMatrix);

    sketchOrigin = sketchOrigin.three().applyMatrix4(_projScreenMatrix);

    let width = sceneSetup.container.clientWidth * DPR / 2;
    let height = sceneSetup.container.clientHeight * DPR /2;

    xx.sub(o);
    yy.sub(o);

    this.viewer.setTransformation(xx.x * width, xx.y * height, yy.x * width, yy.y* height,
      (sketchOrigin.x) * width + width,
      (sketchOrigin.y) * height + height, sceneSetup.oCamera.zoom);
  };
  
  save() {
    localStorage.setItem(this.sketchStorageKey, this.viewer.io.serializeSketch());
    this.onSketchUpdate({key: this.sketchStorageKey});
  }
}

let _projScreenMatrix = new Matrix4();