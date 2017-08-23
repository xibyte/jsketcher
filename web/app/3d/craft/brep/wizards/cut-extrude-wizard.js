import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedPreviewer} from './preview-wizard'
import {getEncloseDetails} from '../cut-extrude'
import {TriangulatePolygons} from '../../../triangulation'
import Vector from '../../../../math/vector'
import {reversedIndex} from '../../../../utils/utils'


const METADATA = [
  ['value'   , 'number',  50],
  ['prism'   , 'number',  1 ,  {min: 0, step: 0.1, round: 1}],
  ['angle'   , 'number',  0 ,  {}],
  ['rotation', 'number',  0 ,  {step: 5}],
  ['face'    , 'face'  ,  S  ]
];

export class CutWizard extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'CUT', METADATA, initialState)
  }

  createPreviewObject(app, params) {
    return CUT_PREVIEWER.create(app, params);
  }

  uiLabel(name) {
    if ('value' == name) return 'depth';
    return super.uiLabel(name);
  }
}

export class ExtrudeWizard extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'EXTRUDE', METADATA, initialState)
  }

  createPreviewObject(app, params) {
    return EXTRUDE_PREVIEWER.create(app, params);
  }

  uiLabel(name) {
    if ('value' == name) return 'height';
    return super.uiLabel(name);
  }
}

export class ExtrudePreviewer extends SketchBasedPreviewer {

  constructor(inversed) {
    super();
    this.inversed = inversed;
  }

  createImpl(app, params, sketch, face) {
    const encloseDetails = getEncloseDetails(params, sketch, face.surface(), !this.inversed, true);
    const triangles = [];
    for (let d of encloseDetails) {
      const base = d.basePath.points;
      const lid = d.lidPath.points;
      const n = base.length;
      for (let p = n - 1, q = 0; q < n; p = q ++) {
        triangles.push([ base[p], base[q], lid[q] ]);
        triangles.push([ lid[q], lid[p], base[p] ]);
      }

      function collectOnSurface(points, normal) {
        TriangulatePolygons([points], normal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
          .forEach(tr => triangles.push(tr));
      }
      collectOnSurface(base, d.baseSurface.normal);
      collectOnSurface(lid, d.lidSurface.normal);
    }
    return triangles;
  }
}

const EXTRUDE_PREVIEWER = new ExtrudePreviewer(false);
const CUT_PREVIEWER = new ExtrudePreviewer(true);
