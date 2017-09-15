import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedNurbsPreviewer } from './preview-wizard'
import {TriangulatePolygons} from '../../../tess/triangulation'
import {revolveToWallNurbs} from '../../../../brep/brep-builder'
import {evalPivot} from '../revolve'
import Vector from '../../../../math/vector'

const METADATA = [
  ['angle'   , 'number',  5, {min: -360, max: 360, step: 10}],
  ['pivot'   , 'sketch.segment'  ,  S  ],
  ['face'    , 'face'  ,  S  ]
];

export class RevolveWizard extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'REVOLVE', METADATA, initialState)
  }

  createPreviewObject(app, params) {
    return REVOLVE_PREVIEWER.createMesh(app, params);
  }
}

export class RevolvePreviewer extends SketchBasedNurbsPreviewer {

  createNurbses(app, params, sketch, face) {
    const surface = face.surface();
    const pivot =  evalPivot(params.pivot, sketch, surface);
    const nurbses = [];
    const contours = sketch.fetchContours();
    for (let contour of contours) {
      const basePath = contour.transferOnSurface(surface);
      revolveToWallNurbs(basePath, surface, pivot.p0, pivot.v, params.angle).forEach(nurbs => nurbses.push(nurbs));
    }
    return nurbses;
  }
}


const REVOLVE_PREVIEWER = new RevolvePreviewer();
