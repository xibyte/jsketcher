import DPR from 'dpr';
import './utils/threeLoader';
import './utils/vectorThreeEnhancement';
import {CADTrackballControls} from './controls/CADTrackballControls';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Euler,
  Matrix4,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector3,
  WebGLRenderer
} from "three";
import {Emitter, stream} from "lstream";

export default class SceneSetUp {
  workingSphere: number;
  container: HTMLElement;
  scene: Scene;
  rootGroup: Object3D;
  oCamera: OrthographicCamera;
  pCamera: PerspectiveCamera;
  camera: PerspectiveCamera;
  light: DirectionalLight;
  renderer: WebGLRenderer;
  private _prevContainerWidth: number;
  private _prevContainerHeight: number;
  trackballControls: CADTrackballControls;
  viewportSizeUpdate$ = stream();
  sceneRendered$: Emitter<any> = stream();

  renderRequested: boolean;

  constructor(container) {
    
    this.workingSphere = 10000;
    this.container = container;
    this.scene = new Scene();
    this.rootGroup = this.scene;
    this.scene.userData.sceneSetUp = this;
    this.renderRequested = false;

    this.setUpCamerasAndLights();
    this.setUpControls();

    this.animate();
  }

  aspect() {
    return this.container.clientWidth / this.container.clientHeight;
  }

  requestRender() {
    this.renderRequested = true;
  }

  createOrthographicCamera() {
    let width = this.container.clientWidth;
    let height = this.container.clientHeight;
    let factor = ORTHOGRAPHIC_CAMERA_FACTOR;
    this.oCamera = new OrthographicCamera(-width / factor,
      width / factor,
      height / factor,
      -height / factor, 0.1, 1000000);
    this.oCamera.position.z = 1000;
    this.oCamera.position.x = -1000;
    this.oCamera.position.y = 300;
  }

  createPerspectiveCamera() {
    this.pCamera = new PerspectiveCamera( 60, this.aspect(), 0.1, 1000000 );
    this.pCamera.position.z = 1000;
    this.pCamera.position.x = -1000;
    this.pCamera.position.y = 300;
  }

  setUpCamerasAndLights() {
    this.createOrthographicCamera();
    this.createPerspectiveCamera();

    this.camera = this.pCamera;
    
    this.light = new DirectionalLight( 0xffffff );
    this.light.position.set( 10, 10, 10 );
    this.scene.add(this.light);

    this.scene.add( new AmbientLight( 0xffffff, 0.25 ) );

    this.renderer = new WebGLRenderer();
    this.renderer.setPixelRatio(DPR);
    this.renderer.setClearColor(0x808080, 1);
    this.renderer.setSize( this.container.clientWidth,  this.container.clientHeight );
    this.container.appendChild( this.renderer.domElement );
  }
  
  updateViewportSize() {
    if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
      this.updatePerspectiveCameraViewport();
      this.updateOrthographicCameraViewport();
      this.renderer.setSize( this.container.clientWidth, this.container.clientHeight );
      this.viewportSizeUpdate$.next();
      this.__render_NeverCallMeFromOutside();
    }
  }

  updateViewportSizeIfNeeded() {
    if (this._prevContainerWidth !== this.container.clientWidth || 
        this._prevContainerHeight !== this.container.clientHeight) {
      this.updateViewportSize();
      this._prevContainerWidth = this.container.clientWidth;
      this._prevContainerHeight = this.container.clientHeight;
    }
  }

  updatePerspectiveCameraViewport() {
    this.pCamera.aspect = this.aspect();
    this.pCamera.updateProjectionMatrix();
  }

  updateOrthographicCameraViewport() {
    let width = this.container.clientWidth;
    let height = this.container.clientHeight;
    let factor = ORTHOGRAPHIC_CAMERA_FACTOR;
    this.oCamera.left = - width / factor;
    this.oCamera.right = width / factor;
    this.oCamera.top = height / factor;
    this.oCamera.bottom = - height / factor;
    this.oCamera.updateProjectionMatrix();
  }
  
  setCamera(camera) {
    let camPosition = new Vector3();
    let camRotation = new Euler();
    let tempMatrix = new Matrix4();

    camPosition.setFromMatrixPosition( this.camera.matrixWorld );
    camRotation.setFromRotationMatrix( tempMatrix.extractRotation( this.camera.matrixWorld ) );
    let camDistance = camera.position.length();

    camera.up.copy(this.camera.up);
    camera.position.copy(camPosition);
    camera.quaternion.copy(camPosition);
    this.trackballControls.setCameraMode(camera.isOrthographicCamera);
    camera.position.normalize();
    camera.position.multiplyScalar(camDistance);
    
    this.camera = camera;
    this.trackballControls.object = camera;
    this.requestRender();
  }

  setUpControls() {
    //  controls = new THREE.OrbitControls( camera , renderer.domElement);
    let trackballControls: any = new CADTrackballControls(this.camera , this.renderer.domElement);

    // document.addEventListener( 'mousemove', function(){

    //   controls.update();

    // }, false );
    trackballControls.rotateSpeed = 3.8 * DPR;
    trackballControls.projectionZoomSpeed = 0.5 * DPR;
    trackballControls.zoomSpeed = 1.2 * DPR;
    trackballControls.panSpeed = 0.3 * DPR;

    trackballControls.noZoom = false;
    trackballControls.noPan = false;

    trackballControls.staticMoving = true;
    trackballControls.dynamicDampingFactor = 0.3;

    trackballControls.keys = [ 65, 83, 68 ];
    this.trackballControls = trackballControls;
  }

  createRaycaster(viewX, viewY) {
    let raycaster = new Raycaster();
    raycaster.params.Line.threshold = 12 * (this._zoomMeasure() * 0.8);

    (raycaster.params as any).Line2 = {
      threshold: 20
    };

    let x = ( viewX / this.container.clientWidth ) * 2 - 1;
    let y = - ( viewY / this.container.clientHeight ) * 2 + 1;

    let mouse = new Vector3( x, y, 1 );
    raycaster.setFromCamera( mouse, this.camera );
    return raycaster;
  }
  
  raycast(event, objects, logInfoOut = null) {
    const raycaster = this.createRaycaster(event.offsetX, event.offsetY);
    if (logInfoOut !== null) {
      logInfoOut.ray = raycaster.ray
    }

    const intersects = [];

    function intersectObject(object) {

      object.raycast( raycaster, intersects );

      const children = object.children;

      if (object.visible) {
        for ( let i = 0, l = children.length; i < l; i ++ ) {
          intersectObject(children[ i ]);
        }
      }
    }

    objects.forEach(intersectObject);

    intersects.sort((a, b) => {
      if (Math.abs(a.distance - b.distance) < 0.01 && (a.object.raycastPriority || b.object.raycastPriority)) {
        return b.object.raycastPriority||0 - a.object.raycastPriority||0;
      }
      return a.distance - b.distance;
    })
    return intersects;
  }

  customRaycast(from3, to3, objects) {
    let raycaster = new Raycaster();
    let from = new Vector3().fromArray(from3);
    let to = new Vector3().fromArray(to3);
    let dir = to.sub(from);
    let dist = dir.length();
    raycaster.set(from, dir.normalize());
    return raycaster.intersectObjects(objects, true ).filter(h => h.distance <= dist);
  }
  
  modelToScreen(pos) {
    let width = this.container.clientWidth, height = this.container.clientHeight;
    let widthHalf = width / 2, heightHalf = height / 2;

    let vector = new Vector3();
    vector.copy(pos);
    vector.project(this.camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;
    return vector;
  }
  
  lookAtObject(obj) {
    let box = new Box3();
    box.setFromObject(obj);
    let size = box.getSize(new Vector3());
    //this.camera.position.set(0,0,0);
    box.getCenter(this.camera.position);
    const maxSize = Math.max(size.x, size.z);
    const dist = maxSize / 2 / Math.tan(Math.PI * this.camera.fov / 360);
    this.camera.position.addScaledVector(this.camera.position.normalize(), 5000);
    //this.camera.position.sub(new THREE.Vector3(0, 0, dist));
    this.camera.up = new Vector3(0, 1, 0);
  }

  _zoomMeasure() {
    return this.trackballControls.object.position.length() / 1e3;
  }
  
  animate() {
    requestAnimationFrame( () => this.animate() );
    const controlsChangedViewpoint = this.trackballControls.evaluate();
    if (controlsChangedViewpoint || this.renderRequested) {
      this.__render_NeverCallMeFromOutside();
    }
    this.updateViewportSizeIfNeeded();
  }

  private __render_NeverCallMeFromOutside() {
    this.renderRequested = false;
    this.light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.renderer.render(this.scene, this.camera);
    this.sceneRendered$.next();
  }

  domElement() {
    return this.renderer.domElement;   
  }
}

export function getSceneSetup(object3D) {
  do {
    if (object3D.userData.sceneSetUp) {
      return object3D.userData.sceneSetUp;
    }
    object3D = object3D.parent;
  } while(object3D);
  return null;
}

const ORTHOGRAPHIC_CAMERA_FACTOR = 1;