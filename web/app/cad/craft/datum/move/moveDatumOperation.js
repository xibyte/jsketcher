import schema from './moveDatumOpSchema';
import {renderPoint} from 'renders';
import {MDatum} from '../../../model/mdatum';
import MoveDatumWizard from './MoveDatumWizard';
import {NOOP} from 'gems/func';


function move(params, {cadRegistry}) {
  
  let mDatum = cadRegistry.findDatum(params.datum);
  
  let csys = mDatum.csys.clone();
  csys.origin.x += params.x;
  csys.origin.y += params.y;
  csys.origin.z += params.z;
  
  return {
    outdated: [mDatum],
    created: [new MDatum(csys)]
  }
}

function previewer(ctx, initialParams, updateParams) {

  let mDatum = ctx.services.cadRegistry.findDatum(initialParams.datum);
  if (!mDatum) {
    return null;
  }
  let view = mDatum.ext.view;
  if (!view) {
    return null;
  }

  let datum3D = view.rootGroup;
  datum3D.beginOperation();
  datum3D.onMove = (begin, end, delta) => {
    updateParams(params => {
      params.x = end.x - mDatum.csys.origin.x;
      params.y = end.y - mDatum.csys.origin.y;
      params.z = end.z - mDatum.csys.origin.z;
    })
  };

  function update(params) {
    datum3D.csys.origin.setV(mDatum.csys.origin);
    datum3D.csys.origin.x += params.x;
    datum3D.csys.origin.y += params.y;
    datum3D.csys.origin.z += params.z;
  }

  function dispose() {
    datum3D.csys.copy(mDatum.csys);
    datum3D.finishOperation();
    datum3D.operationStarted = false;
    datum3D.exitEditMode();
    datum3D.applyMove = NOOP; 
  }


  update(initialParams);

  return {
    update, dispose
  }
}

export default {
  id: 'DATUM_MOVE',
  label: 'Move Datum',
  icon: 'img/cad/plane',
  info: 'moves a datum',
  paramsInfo: renderPoint,
  previewer,
  run: move,
  form: MoveDatumWizard,
  schema
};



