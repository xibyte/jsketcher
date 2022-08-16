import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2';
import {Vector2} from 'three';
import SceneSetUp from "scene/sceneSetup";
// import {BufferGeometry, BufferAttribute} from "three/src/core/BufferGeometry";

export default class ScalableLine extends LineSegments2 {

  constructor(sceneSetup, tessellation, width, color) {
    super(createGeometry(tessellation), createMaterial(sceneSetup, color, width));
    this.resolutionListenerDisposer = sceneSetup.viewportSizeUpdate$.attach(() => {
      this.material.resolution = getResolution(sceneSetup)
    });
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.resolutionListenerDisposer();
  }
}

function getResolution(sceneSetup) {
  return new Vector2(sceneSetup.container.clientWidth, sceneSetup.container.clientHeight);
}

function createMaterial(sceneSetup, color, width, opacity, ambient, offset) {
  // let modelSize = 1;
  // let modelSizePx = width;
  // let k = viewScaleFactor(sceneSetup, ORIGIN, modelSizePx, modelSize);

  return new LineMaterial( {
    color,
    linewidth: width,
    resolution: getResolution(sceneSetup),
    // worldUnits: false,
    // linewidth: 0.0031,//width,
    // vertexColors: true,
    // dashed: false,
    // alphaToCoverage: true,
  });

  //
  // if (opacity !== undefined) {
  //   materialParams.transparent = true;
  //   materialParams.opacity = opacity;
  // }
  // return ambient ? new MeshBasicMaterial(materialParams) : new MeshPhongMaterial(materialParams);
}

function createGeometry(tessellation) {

  const positions = [];
  for ( const point of tessellation ) {
    positions.push( ...point );
  }
  const geometry = new LineGeometry();
  geometry.setPositions( positions );

  return geometry;

}
