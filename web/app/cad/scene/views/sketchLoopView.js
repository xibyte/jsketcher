import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {tessellateLoopsOnSurface} from 'cad/tess/brep-tess';
import {createSolidMaterial} from '../views/viewUtils';
import {DoubleSide, Mesh} from 'three';
import {surfaceAndPolygonsToGeom} from './viewUtils';
import {TriangulatePolygons} from 'cad/tess/triangulation';
import Vector from 'math/vector';
import {LOOP} from 'cad/model/entities';
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


    const surface = mLoop.face.surface;
    let tess;
    if (surface.simpleSurface && surface.simpleSurface.isPlane) {
      const polygon = mLoop.contour.tessellateInCoordinateSystem(mLoop.face.csys);
      tess = TriangulatePolygons([polygon], mLoop.face.csys.z, v => v.data(), arr => new Vector().set3(arr));
    } else {
      tess = tessellateLoopsOnSurface(surface, [mLoop.contour], contour => contour.segments,
        seg => seg.toNurbs(mLoop.face.csys),
        seg => seg.inverted);
    }
    
    const geometry = surfaceAndPolygonsToGeom(surface, tess);

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

    setAttribute(this.mesh, LOOP, this);

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
