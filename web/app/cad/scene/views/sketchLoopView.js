import {MarkTracker, View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {tessellateLoopsOnSurface} from '../../tess/brep-tess';
import {createSolidMaterial} from '../wrappers/sceneObject';
import {DoubleSide, Geometry, Mesh} from 'three';
import {surfaceAndPolygonsToGeom} from '../wrappers/brepSceneObject';
import {TriangulatePolygons} from '../../tess/triangulation';
import Vector from 'math/vector';
import {LOOP} from '../../model/entities';
import {setAttribute} from 'scene/objectData';

const HIGHLIGHT_COLOR = 0xDBFFD9;
const SELECT_COLOR = 0xCCEFCA;

const MarkerTable = [
  {
    type: 'selection',
    priority: 10,
    colors: [SELECT_COLOR],
  },
  {
    type: 'highlight',
    priority: 1,
    colors: [HIGHLIGHT_COLOR],
  },
];


export class SketchLoopView extends View {

  constructor(ctx, mLoop) {
    super(ctx, mLoop, MarkerTable);
    this.rootGroup = SceneGraph.createGroup();

    const geometry = new Geometry();
    geometry.dynamic = true;
    this.mesh = new Mesh(geometry, createSolidMaterial({
      // color: HIGHLIGHT_COLOR,
      side: DoubleSide,
      // transparent: true,
      // depthTest: true,
      // depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0, // should less than offset of loop lines
      polygonOffsetUnits: -1.0,
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
    this.mesh.onMouseEnter = () => {
      if (!this.isDisposed) {
        this.ctx.highlightService.highlight(this.model.id);
      }
    }
    this.mesh.onMouseLeave = () => {
      if (!this.isDisposed) {
        this.ctx.highlightService.unHighlight(this.model.id);
      }
    }
    this.mesh.raycastPriority = 10;
    this.mesh.onDblclick = () => {
      ctx.sketcherService.sketchFace(this.model.face);
    }
  }

  updateVisuals() {
    const markColor = this.markColor;
    if (!markColor) {
      this.mesh.material.visible = false;
    } else {
      this.mesh.material.color.set(markColor);
      this.mesh.material.visible = true;
    }
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.geometry.dispose();
    super.dispose();
  }
}
