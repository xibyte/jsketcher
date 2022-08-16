import schema from './moveDatumOpSchema';
import {MDatum} from '../../../model/mdatum';
import MoveDatumWizard from './MoveDatumWizard';
import {roundInteractiveInput} from '../../wizard/roundUtils';
import {EMPTY_ARRAY} from 'gems/iterables';
import {pointAsText} from 'renders';
import {DatumParamsRenderer} from '../DatumParamsRenderer';


function move(params, {cadRegistry}) {
  
  const mDatum = cadRegistry.findDatum(params.datum);
  
  const csys = mDatum.csys.clone();
  csys.origin.x += params.x;
  csys.origin.y += params.y;
  csys.origin.z += params.z;
  
  return {
    consumed: params.copy ? EMPTY_ARRAY : [mDatum],
    created: [new MDatum(csys)]
  }
}

function previewer(ctx, initialParams, updateParams) {

  const mDatum = ctx.services.cadRegistry.findDatum(initialParams.datum);
  if (!mDatum) {
    return null;
  }
  const view = mDatum.ext.view;
  if (!view) {
    return null;
  }

  const datum3D = view.rootGroup;
  datum3D.beginOperation();
  datum3D.onMove = (begin, end, delta) => {
    updateParams(params => {
      params.x = roundInteractiveInput(end.x - mDatum.csys.origin.x);
      params.y = roundInteractiveInput(end.y - mDatum.csys.origin.y);
      params.z = roundInteractiveInput(end.z - mDatum.csys.origin.z);
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
  }

  update(initialParams);

  return {
    update, dispose
  }
}

export default {
  id: 'DATUM_MOVE',
  label: 'Move Datum',
  icon: 'img/cad/datum-move',
  info: 'moves a datum',
  paramsInfoComponent: DatumParamsRenderer,
  paramsInfo: pointAsText,
  previewer,
  run: move,
  form: MoveDatumWizard,
  schema
};



