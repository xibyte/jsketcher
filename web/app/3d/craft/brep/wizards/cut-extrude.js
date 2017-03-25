import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedPreviewer} from './preview-wizard'
import {ParametricExtruder, fixNegativeValue} from '../cut-extrude'
import {TriangulatePolygons} from '../../../triangulation'
import Vector from '../../../../math/vector'

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
    const normal = face.normal();
    let reverseNormal = this.inversed;
    if (params.value < 0) {
      params = fixNegativeValue(params);
      reverseNormal = !reverseNormal;
    }
    const parametricExtruder = new ParametricExtruder(params);
    const baseNormal = reverseNormal ? normal : normal.negate();
    const lidNormal =  reverseNormal ? baseNormal.negate() : normal;
    
    parametricExtruder.prepareLidCalculation(baseNormal, lidNormal);
    
    const triangles = [];    
    for (let base of sketch) {
      var lid = parametricExtruder.calculateLid(base);
      const n = base.length;
      for (let p = n - 1, q = 0; q < n; p = q ++) {
        triangles.push([ base[p], base[q], lid[q] ]);
        triangles.push([ lid[q], lid[p], base[p] ]);
      }
      TriangulatePolygons([base], baseNormal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
        .forEach(tr => triangles.push(tr));
      
      TriangulatePolygons([lid], lidNormal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
        .forEach(tr => triangles.push(tr));
    }
    return triangles;
  }
}

const EXTRUDE_PREVIEWER = new ExtrudePreviewer(false);
const CUT_PREVIEWER = new ExtrudePreviewer(true);
