import {PreviewWizard, IMAGINARY_SURFACE_MATERIAL} from './preview-wizard'

const METADATA = [
  ['width'   , 'number',  500,  {min: 0}],
  ['height'  , 'number',  500,  {min: 0}],
  ['depth'   , 'number',  500,  {min: 0}]
];


export class BoxWizard extends PreviewWizard {
  
  constructor(app, initialState) {
    super(app, 'BOX', METADATA, initialState);
  }
  
  createPreviewObject(app, params) {
    const geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
    return new THREE.Mesh(geometry, IMAGINARY_SURFACE_MATERIAL);
  }
}

