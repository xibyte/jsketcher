import {createMeshGeometry} from 'scene/geoms';
import {STANDARD_BASES} from '../../../../math/l3space';
import {Plane} from '../../../../brep/geom/impl/plane';
import Vector from 'math/vector';
import PlaneWizard from './SimplePlaneWizard';
import {MOpenFaceShell} from '../../../model/mopenFace';
import schema from './simplePlaneOpSchema';
import {PlaneSurfacePrototype} from '../../../model/surfacePrototype';

function paramsToPlane({orientation, parallelTo, depth}, cadRegistry) {
  let face = null;
  if (parallelTo) {
    face = cadRegistry.findFace(parallelTo);
  }
  let plane = null;
  if (face === null) {
    const normal = STANDARD_BASES[orientation][2];
    plane = new Plane(normal, depth);
  } else {
    let base = face.surface.tangentPlaneInMiddle();
    plane = new Plane(base.normal, base.w + depth);
  }
  return plane;
}

function createPlane(params, {cadRegistry}) {
  return {
    outdated: [],
    created: [new MOpenFaceShell(new PlaneSurfacePrototype(paramsToPlane(params, cadRegistry)))]
  }
}

function previewGeomProvider(params, {cadRegistry}) {
  let plane = paramsToPlane(params, cadRegistry);
  let tr = plane.get3DTransformation();
  const w = 375, h = 375;
  const a = tr._apply(new Vector(-w, -h, 0));
  const b = tr._apply(new Vector( w, -h, 0));
  const c = tr._apply(new Vector( w,  h, 0));
  const d = tr._apply(new Vector(-w,  h, 0));
  
  let trs = [[a, b, c], [a, c, d]];
  return createMeshGeometry(trs);
}

export default {
  id: 'PLANE',
  label: 'Plane',
  icon: 'img/cad/plane',
  info: 'creates new object plane',
  paramsInfo: ({depth}) => `(${depth})`,
  previewGeomProvider,
  run: createPlane,
  form: PlaneWizard,
  schema
};



