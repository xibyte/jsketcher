import {createMeshGeometry} from 'scene/geoms';
import {Plane} from 'geom/impl/plane';
import Vector from 'math/vector';
import PlaneWizard from './SimplePlaneWizard';
import {MOpenFaceShell} from '../../../model/mopenFace';
import schema from './simplePlaneOpSchema';
import {PlaneSurfacePrototype} from '../../../model/surfacePrototype';
import {STANDARD_BASES} from 'math/basis';
import {MFace} from "cad/model/mface";
import CSys from "math/csys";
import {MDatum} from "cad/model/mdatum";

function paramsToPlane({orientation, datum, depth}, cadRegistry) {
  const csys = datum ? datum.csys : CSys.ORIGIN;

  let axis;
  if (orientation === 'XY') {
    axis = csys.z;
  } else if (orientation === 'XZ') {
    axis = csys.y;
  } else {
    axis = csys.x;
  }

  const w = axis.multiply(depth)._plus(csys.origin).dot(axis);

  return new Plane(axis, w);
}

function createPlane(params, {cadRegistry}) {
  return {
    consumed: [],
    created: [new MOpenFaceShell(new PlaneSurfacePrototype(paramsToPlane(params, cadRegistry)))]
  }
}

function previewGeomProvider(params, {cadRegistry}) {
  const plane = paramsToPlane(params, cadRegistry);
  const tr = plane.get3DTransformation();
  const w = 375, h = 375;
  const a = tr._apply(new Vector(-w, -h, 0));
  const b = tr._apply(new Vector( w, -h, 0));
  const c = tr._apply(new Vector( w,  h, 0));
  const d = tr._apply(new Vector(-w,  h, 0));
  
  const trs = [[a, b, c], [a, c, d]];
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



