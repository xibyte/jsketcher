import {AmbientLight, CanvasTexture, PerspectiveCamera, Scene, Sprite, SpriteMaterial, SpotLight, WebGLRenderer} from 'three';
import DPR from '../dpr';
import {MeshArrow} from './objects/auxiliary';
import * as SceneGraph from './sceneGraph';
import {AXIS} from "math/vector";

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const texture = new CanvasTexture(canvas);
  const mat = new SpriteMaterial({map: texture, transparent: true, depthTest: false});
  const sprite = new Sprite(mat);
  sprite.scale.set(0.3, 0.3, 0.3);
  return sprite;
}

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

  const xAxis = createBasisArrow(AXIS.X, 0xFF0000);
  const yAxis = createBasisArrow(AXIS.Y, 0x00FF00);
  const zAxis = createBasisArrow(AXIS.Z, 0x0000FF);

  const xLabel = makeLabel('X', '#ff4444');
  const yLabel = makeLabel('Y', '#44ff44');
  const zLabel = makeLabel('Z', '#4488ff');
  xLabel.position.set(1.15, 0, 0);
  yLabel.position.set(0, 1.15, 0);
  zLabel.position.set(0, 0, 1.15);

  const root = SceneGraph.createGroup();
  const csys = SceneGraph.createGroup();
  const scene = new Scene();
  csys.add(xAxis);
  csys.add(yAxis);
  csys.add(zAxis);
  csys.add(xLabel);
  csys.add(yLabel);
  csys.add(zLabel);

  root.add(csys);
  scene.add(root);

  const ambientLight = new AmbientLight(0x0f0f0f);
  scene.add(ambientLight);
  const spotLight = new SpotLight(0xffffff);
  spotLight.position.set(0, 0, 5);
  spotLight.castShadow = true;
  scene.add(spotLight);

  const camera = new PerspectiveCamera(35, 1, 0.1, 2000);
  camera.position.z = 5;

  const renderer = new WebGLRenderer({alpha: true});
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  function renderScene() {
    renderer.render(scene, camera);
  }

  function render(cameraToSync) {
    root.quaternion.setFromRotationMatrix(cameraToSync.matrixWorldInverse);
    renderScene();
  }

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function dispose() {
    xAxis.dispose();
    yAxis.dispose();
    zAxis.dispose();
    renderer.dispose();
  }

  return {render, dispose, resize};
}