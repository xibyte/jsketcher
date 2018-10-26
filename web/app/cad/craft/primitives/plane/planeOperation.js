import {createMeshGeometry} from 'scene/geoms';
import {Plane} from '../../../../brep/geom/impl/plane';
import Vector from 'math/vector';
import PlaneWizard from './PlaneWizard';
import {MOpenFaceShell} from '../../../model/mopenFace';
import schema from './planeOpSchema';
import {CSysPlaneSurfacePrototype} from '../../../model/surfacePrototype';

const WIDTH = 750;
const HEIGHT = 750;

function createPlane(params, services) {
  let mDatum = services.cadRegistry.findDatum(params.datum);

  return {
    outdated: [mDatum],
    created: [new MOpenFaceShell(new CSysPlaneSurfacePrototype(mDatum.csys), mDatum.csys)]
  }
}

function previewGeomProvider(params, services) {
  let mDatum = services.cadRegistry.findDatum(params.datum);

  if (!mDatum) {
    return null;
  }

  let tr = mDatum.csys.outTransformation;
  
  const a = tr._apply(new Vector(0, 0, 0));
  const b = tr._apply(new Vector(WIDTH, 0, 0));
  const c = tr._apply(new Vector(WIDTH, HEIGHT, 0));
  const d = tr._apply(new Vector(0, HEIGHT, 0));
  
  let trs = [[a, b, c], [a, c, d]];
  return createMeshGeometry(trs);
}

export default {
  id: 'PLANE_FROM_DATUM',
  label: 'Plane',
  icon: 'img/cad/plane',
  info: 'creates new object plane off of datum',
  paramsInfo: ({datum}) => `(${datum})`,
  previewGeomProvider,
  run: createPlane,
  form: PlaneWizard,
  schema
};



