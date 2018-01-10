import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedPreviewer} from './preview-wizard'
import {getEncloseDetails} from '../cut-extrude'
import {TriangulatePolygons} from '../../../tess/triangulation'
import Vector from 'math/vector';
import {curveTessParams} from "../../../../brep/geom/impl/curve/curve-tess";


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
    if ('value' === name) return 'depth';
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
    if ('value' === name) return 'height';
    return super.uiLabel(name);
  }
}

export class ExtrudePreviewer extends SketchBasedPreviewer {

  constructor(inversed) {
    super();
    this.inversed = inversed;
  }

  createImpl(app, params, sketch, face) {
    const encloseDetails = getEncloseDetails(params, sketch, face.surface().tangentPlane(0, 0), !this.inversed);
    const triangles = [];

    for (let {basePath, lidPath, baseSurface, lidSurface} of encloseDetails) {
      const basePoints = [];
      const lidPoints = [];
      for (let i = 0; i < basePath.length; ++i) {
        let baseNurbs = basePath[i];    
        let lidNurbs = lidPath[i];  
        
        let tessCurve = params.prism > 1 ? lidNurbs : baseNurbs;
        
        const us = curveTessParams(tessCurve.impl, tessCurve.uMin, tessCurve.uMax);
        const base = us.map(u => baseNurbs.point(u));
        const lid = us.map(u => lidNurbs.point(u));
        const n = base.length;
        for (let p = n - 1, q = 0; q < n; p = q ++) {
          triangles.push([ base[p], base[q], lid[q] ]);
          triangles.push([ lid[q], lid[p], base[p] ]);
        }
        base.forEach(p => basePoints.push(p));
        lid.forEach(p => lidPoints.push(p));
      }

      function collectOnSurface(points, normal) {
        TriangulatePolygons([points], normal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
          .forEach(tr => triangles.push(tr));
      }
      collectOnSurface(basePoints, baseSurface.normal);
      collectOnSurface(lidPoints, lidSurface.normal);
    }
    return triangles;
  }
}

const EXTRUDE_PREVIEWER = new ExtrudePreviewer(false);
const CUT_PREVIEWER = new ExtrudePreviewer(true);
