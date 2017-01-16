import {CURRENT_SELECTION as S} from './wizard'
import {PreviewWizard, SketchBasedPreviewMaker} from './preview-wizard'
import {ParametricExtruder} from '../cut-extrude'

const METADATA = [
  ['value'   , 'number',  50,  {min: 0}],
  ['prism'   , 'number',  1 ,  {min: 0, step: 0.1, round: 1}],
  ['angle'   , 'number',  0 ,  {}],
  ['rotation', 'number',  0 ,  {step: 5}],
  ['face'    , 'face'  ,  S  ]
];

class Cut extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'CUT', METADATA, null, initialState)
  }
  
  uiLabel(name) {
    if ('value' == name) return 'depth';
    return super.uiLabel(name);
  }
}

class Extrude extends PreviewWizard {
  constructor(app, initialState) {
    super(app, 'EXTRUDE', METADATA, new ExtrudePreviewMaker(), initialState)
  }
  
  uiLabel(name) {
    if ('value' == name) return 'height';
    return super.uiLabel(name);
  }
}

export class ExtrudePreviewMaker extends SketchBasedPreviewMaker{

  constructor(cut) {
    super();
    this.cut = cut;
  }
  
  createImpl(app, params, sketch, face) {
    const parametricExtruder = new ParametricExtruder(face, params);

    const baseNormal = this.cut ? face.surface.normal : face.surface.normal.negate();
    const lidNormal = this.cut ? baseNormal.negate() : face.surface.normal;
    
    parametricExtruder.prepareLidCalculation(baseNormal, lidNormal);
    
    const triangles = [];    
    for (let base of sketch) {
      var lid = parametricExtruder.calculateLid(base);
      const n = base.length;
      for (let p = n - 1, q = 0; q < n; p = q ++) {
        triangles.push([ base[p], base[q], lid[q] ]);
        triangles.push([ lid[q], lid[p], base[p] ]);
      }
    }
    return triangles;
  }
}