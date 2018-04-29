import {createMeshGeometry} from 'scene/geoms';
import {CURRENT_SELECTION as S} from '../wizard/wizardPlugin';
import {STANDARD_BASES} from '../../../math/l3space';
import {Plane} from '../../../brep/geom/impl/plane';
import {PlaneSceneObject} from '../../scene/wrappers/planeSceneObject';
import Vector from 'math/vector';

const METADATA = [
  ['orientation', 'choice', 'XY', {options: ['XY', 'XZ', 'ZY']}],
  ['parallelTo', 'face', S],
  ['depth', 'number',  0, {}]
];

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
    plane = new Plane(face.surface().normalInMiddle(), depth);
  }
  return plane;
}

function createPlane(params, {cadRegistry}) {
  return {
    outdated: [],
    created: [new PlaneSceneObject(paramsToPlane(params, cadRegistry))]
  }
}

function previewGeomProvider(params, {cadRegistry}) {
  let plane = paramsToPlane(params, cadRegistry);
  let _3DTransformation = plane.get3DTransformation();
  const w = 375, h = 375;
  const a = new Vector(-w, -h, 0);
  const b = new Vector( w, -h, 0);
  const c = new Vector( w,  h, 0);
  const d = new Vector(-w,  h, 0);
  let trs = [[a, b, c], [a, c, d]];
  trs.forEach(tr => tr.forEach(p => _3DTransformation._apply(p)));
  return createMeshGeometry(trs);
}

export default {
  id: 'PLANE',
  metadata: METADATA,
  label: 'Plane',
  icon: 'img/cad/plane',
  info: 'creates new object plane',
  paramsInfo: ({depth}) => `(${depth})`,
  previewGeomProvider,
  run: createPlane
};

