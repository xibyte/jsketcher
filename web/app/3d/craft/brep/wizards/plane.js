import {PreviewWizard, IMAGINARY_SURFACE_MATERIAL} from './preview-wizard'
import {CURRENT_SELECTION as S} from './wizard'
import {AXIS, IDENTITY_BASIS, STANDARD_BASES} from '../../../../math/l3space'
import Vector from '../../../../math/vector'

const METADATA = [
  ['orientation', 'choice', 'XY', {options: ['XY', 'XZ', 'ZY']}],
  ['parallelTo', 'face', S],
  ['depth', 'number',  0, {}]
];

export class PlaneWizard extends PreviewWizard {
  
  constructor(app, initialState) {
    super(app, 'PLANE', METADATA, initialState);
  }
  
  createPreviewObject(app, params) {
    let face = null;
    if (params.face) {
      face = this.app.findFace(params.face);
    }
    let basis;
    let depth = params.depth;
    if (face == null) {
      basis = STANDARD_BASES[params.orientation];
    } else {
      basis = face.basis();
      depth += face.depth();
    }

    const w = 375, h = 375;
    const a = new Vector(-w, -h, 0);
    const b = new Vector( w, -h, 0);
    const c = new Vector( w,  h, 0);
    const d = new Vector(-w,  h, 0);

    const plane = PreviewWizard.createMesh([[a, b, c], [a, c, d]])

    const m = new THREE.Matrix4();
    m.makeBasis.apply(m, basis);
    const wVec = new THREE.Vector3(0, 0, depth);
    wVec.applyMatrix4(m);
    m.setPosition(wVec);
    plane.geometry.applyMatrix(m);
    plane.geometry.computeFaceNormals();
    return plane;
  }
}

