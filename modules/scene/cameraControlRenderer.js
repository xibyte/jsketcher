import {AmbientLight, PerspectiveCamera, Scene, SpotLight, WebGLRenderer} from 'three';
import DPR from '../dpr';
import {MeshArrow} from './objects/auxiliary';
import * as SceneGraph from './sceneGraph';
import {AXIS} from "math/vector";

export default function(container) {

  function createBasisArrow(axis, color) {
    return new MeshArrow({
      dir: axis,
      color,
      length: 1, 
      headLength: 0.3, 
      headWidth: 0.15, 
      lineWidth: 0.02
    });
  }

  let xAxis = createBasisArrow(AXIS.X, 0xFF0000);
  let yAxis = createBasisArrow(AXIS.Y, 0x00FF00);
  let zAxis = createBasisArrow(AXIS.Z, 0x0000FF);

  let root = SceneGraph.createGroup();
  let csys = SceneGraph.createGroup();

  let scene = new Scene();
  csys.add(xAxis);
  csys.add(yAxis);
  csys.add(zAxis);
  
  root.add(csys);
  scene.add(root);

  let ambientLight = new AmbientLight(0x0f0f0f);
  scene.add(ambientLight);

  let spotLight = new SpotLight(0xffffff);
  spotLight.position.set(0, 0, 5);
  spotLight.castShadow = true;
  scene.add(spotLight);
  
  let camera = new PerspectiveCamera( 25, 1, 0.1, 2000 );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 5;

  let renderer = new WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(DPR);
  // renderer.setClearColor(0x000000, 1);
  // renderer.setClearAlpha(0);
  renderer.setSize( container.clientWidth,  container.clientHeight );
  container.appendChild( renderer.domElement );

  function renderScene() {
    renderer.render(scene, camera);
  }
  
  function render(cameraToSync) {
    root.quaternion.setFromRotationMatrix( cameraToSync.matrixWorldInverse );
    renderScene();
  }
  
  function dispose() {
    xAxis.dispose();
    yAxis.dispose();
    zAxis.dispose();
    renderer.dispose();
  }

  return {
    render, dispose
  }
}
