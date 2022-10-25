import {createMeshGeometry} from 'scene/geoms';
import {Plane} from 'geom/impl/plane';
import Vector from 'math/vector';
import {MOpenFaceShell} from '../../../../../web/app/cad/model/mopenFace';
import {PlaneSurfacePrototype} from '../../../../../web/app/cad/model/surfacePrototype';
import {STANDARD_BASES} from 'math/basis';
import {MFace} from "cad/model/mface";
import CSys from "math/csys";
import {MDatum} from "cad/model/mdatum";
import {EntityKind} from "cad/model/entities";
import {entityKindCapture} from "cad/craft/schema/types/entityType";






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
  form: [
    {
      type: 'choice',
      style: "dropdown",
      label: 'orientation',
      name: 'orientation',
      style: 'radio',
      values: ['XY', 'XZ', 'ZY'],
      defaultValue: "XY",
    },
    {
      type: 'selection',
      name: 'datum',
      capture: [EntityKind.MDatum,EntityKind.FACE],
      label: 'datum',
      multi: false,
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      label: 'depth',
      name: 'depth',
      defaultValue: 0,
    },
  ],
};



