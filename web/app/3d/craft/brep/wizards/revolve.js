import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedPreviewer} from './preview-wizard'
import {TriangulatePolygons} from '../../../triangulation'
import Vector from '../../../../math/vector'


const METADATA = [
  ['angle'   , 'number',  5, {min: -360, max: 360, step: 10}],
  ['pivot'   , 'sketch'  ,  S  ]
];

export class RevolveWizard extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'REVOLVE', METADATA, initialState)
  }

  createPreviewObject(app, params) {
    return CUT_PREVIEWER.create(app, params);
  }

  uiLabel(name) {
    if ('value' == name) return 'depth';
    return super.uiLabel(name);
  }
}



export class ExtrudePreviewer extends SketchBasedPreviewer {

  createImpl(app, params, sketch, face) {
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
