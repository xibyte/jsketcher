import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {tessellateLoopsOnSurface} from '../../tess/brep-tess';
import {createSolidMaterial} from '../wrappers/sceneObject';
import {DoubleSide, Geometry, Mesh} from 'three';
import {surfaceAndPolygonsToGeom} from '../wrappers/brepSceneObject';
import {TriangulatePolygons} from '../../tess/triangulation';
import Vector from '../../../../../modules/math/vector';

export class SketchLoopView extends View {
  constructor(mLoop) {
    super(mLoop);
    this.rootGroup = SceneGraph.createGroup();

    const geometry = new Geometry();
    geometry.dynamic = true;
    this.mesh = new Mesh(geometry, createSolidMaterial({
      color: 0xDBFFD9,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 0.1,
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
    this.rootGroup.add(this.mesh);
    this.mesh.onMouseEnter = (e) => {
      this.mesh.material.visible = true;
      e.viewer.requestRender();
    };
    this.mesh.onMouseLeave = (e) => {
      this.mesh.material.visible = false;
      e.viewer.requestRender();
    };
  }

  mark(color) {
    
  }

  withdraw(color) {
    
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.geometry.dispose();
    super.dispose();
  }
}