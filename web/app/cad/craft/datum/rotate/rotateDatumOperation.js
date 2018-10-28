import schema from './rotateDatumOpSchema';
import {MDatum} from '../../../model/mdatum';
import RotateDatumWizard from './RotateDatumWizard';
import {Matrix3, ORIGIN} from '../../../../math/l3space';
import {DEG_RAD} from '../../../../math/math';


function rotate(params, {cadRegistry}) {
  
  let mDatum = cadRegistry.findDatum(params.datum);

  let axis = mDatum.csys[params.axis.toLowerCase()];
  
  let csys = mDatum.csys.clone();

  applyRotation(mDatum.csys, csys, params.angle, axis);

  return {
    consumed: [mDatum],
    created: [new MDatum(csys)]
  }
}

let auxMatrix = new Matrix3();

function previewer(ctx, initialParams) {

  let mDatum = ctx.services.cadRegistry.findDatum(initialParams.datum);
  
  if (!mDatum) {
    return null;
  }
  let view = mDatum.ext.view;
  if (!view) {
    return null;
  }

  let datum3D = view.rootGroup;
  datum3D.beginOperation(true);

  function update(params) {
    let axis = mDatum.csys[params.axis.toLowerCase()];
    applyRotation(mDatum.csys, datum3D.csys, params.angle, axis);
  }

  function dispose() {
    datum3D.csys.copy(mDatum.csys);
    datum3D.finishOperation();
  }


  update(initialParams);

  return {
    update, dispose
  }
}

function applyRotation(origCsys, csys, angle, axis) {
  auxMatrix.rotate(angle * DEG_RAD, axis, ORIGIN);
  auxMatrix.__apply(origCsys.x, csys.x);
  auxMatrix.__apply(origCsys.y, csys.y);
  auxMatrix.__apply(origCsys.z, csys.z);
}

export default {
  id: 'DATUM_ROTATE',
  label: 'Rotate Datum',
  icon: 'img/cad/plane',
  info: 'rotates a datum',
  paramsInfo: ({axis, angle}) => `${axis} - ${angle}`,
  previewer,
  run: rotate,
  form: RotateDatumWizard,
  schema
};



