import {MarkTracker, View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {tessellateLoopsOnSurface} from '../../tess/brep-tess';
import {createSolidMaterial} from '../wrappers/sceneObject';
import {DoubleSide, Geometry, Mesh} from 'three';
import {surfaceAndPolygonsToGeom} from '../wrappers/brepSceneObject';
import {TriangulatePolygons} from '../../tess/triangulation';
import Vector from 'math/vector';
import {LOOP} from '../entites';
import {setAttribute} from 'scene/objectData';

export class SketchLoopView extends MarkTracker(View) {
  constructor(mLoop) {
    super(mLoop);
    this.rootGroup = SceneGraph.createGroup();

    const geometry = new Geometry();
    geometry.dynamic = true;
    this.mesh = new Mesh(geometry, createSolidMaterial({
      color: SKETCH_LOOP_DEFAULT_HIGHLIGHT_COLOR,
      side: DoubleSide,
      // transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      visible: false
    }));
    let surface = mLoop.face.surface;
    let tess;
    if (surface.simpleSurface && surface.simpleSurface.isPlane) {
      let polygon = mLoop.contour.tessellateInCoordinateSystem(mLoop.face.csys);
      tess = TriangulatePolygons([polygon], mLoop.face.csys.z, v => v.data(), arr => new Vector().set3(arr));
    } else {
      tess = tessellateLoopsOnSurface(surface, [mLoop.contour], contour => contour.segments,
        seg => seg.toNurbs(mLoop.face.csys),
        seg => seg.inverted);
    }
    
    surfaceAndPolygonsToGeom(surface, tess, this.mesh.geometry);
    this.mesh.geometry.mergeVertices();
    for (let i = 0; i < geometry.faces.length; i++) {
      const meshFace = geometry.faces[i];
      setAttribute(meshFace, LOOP, this);
    }

    this.rootGroup.add(this.mesh);
    this.mesh.onMouseEnter = (e) => {
      this.mark(SKETCH_LOOP_DEFAULT_HIGHLIGHT_COLOR, 5);
      e.viewer.requestRender();
    };
    this.mesh.onMouseLeave = (e) => {
      this.withdraw(5);
      e.viewer.requestRender();
    };
  }

  mark(color = SKETCH_LOOP_DEFAULT_SELECT_COLOR, priority = 10) {
    super.mark(color, priority);
  }
  
  markImpl(color) {
    this.mesh.material.visible = true;
    this.mesh.material.color.setHex(color)
  }

  withdrawImpl() {
    this.mesh.material.visible = false;
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.geometry.dispose();
    super.dispose();
  }
}

const SKETCH_LOOP_DEFAULT_HIGHLIGHT_COLOR = 0xDBFFD9;
const SKETCH_LOOP_DEFAULT_SELECT_COLOR = 0xCCEFCA;