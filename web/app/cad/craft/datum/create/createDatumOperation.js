import DatumWizard from './CreateDatumWizard';
import schema from './createDatumOpSchema';
import {renderPoint} from 'renders';
import DatumObject3D from '../datumObject';
import * as SceneGraph from 'scene/sceneGraph';
import CSys from '../../../../math/csys';
import {MDatum} from '../../../model/mdatum';

function updateCSys(csys, params, findFace) {
  csys.move(0, 0, 0);
  if (params.face) {
    const face = findFace(params.face);
    if (face) {
      csys.copy(face.csys);
    }
  }

  csys.origin.x += params.x;
  csys.origin.y += params.y;
  csys.origin.z += params.z;
}

function create(params, {cadRegistry}) {
  let csys = CSys.origin();
  updateCSys(csys, params, cadRegistry.findFace);

  return {
    consumed: [],
    created: [new MDatum(csys)]
  }
}

function previewer(ctx, initialParams, updateParams) {
  
  let datum3D = new DatumObject3D(CSys.origin(), ctx.services.viewer);

  datum3D.onMove = (begin, end, delta) => {
    updateParams(params => {
      
      params.x = end.x;
      params.y = end.y;
      params.z = end.z;
      if (params.face) {
        let face = ctx.services.cadRegistry.findFace(params.face);
        if (face) {
          params.x -= face.csys.origin.x;
          params.y -= face.csys.origin.y;
          params.z -= face.csys.origin.z;
        }
      }
    })
  };
  
  function update(params) {
    updateCSys(datum3D.csys, params, ctx.services.cadRegistry.findFace);
  }
  
  function dispose() {
    SceneGraph.removeFromGroup(ctx.services.cadScene.workGroup, datum3D);
    datum3D.dispose();
  }

  update(initialParams);
  SceneGraph.addToGroup(ctx.services.cadScene.workGroup, datum3D);

  return {
    update, dispose    
  }
}

export default {
  id: 'DATUM_CREATE',
  label: 'Create Datum',
  icon: 'img/cad/plane',
  info: 'originates a new datum from origin or off of a selected face',
  paramsInfo: renderPoint,
  previewer,
  run: create,
  form: DatumWizard,
  schema
};



