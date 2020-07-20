import CSys from 'math/csys';
import {MDatum} from '../../model/mdatum';

import spatialCurveOpSchema from './spatialCurveOpSchema';
import SpatialCurveWizard from './SpatialCurveWizard';
import spatialCurveEditor from './editor/spatialCurveEditor';

function updateCSys(csys, params, findFace) {
  csys.copy(CSys.ORIGIN);
  if (params.originatingFace) {
    const face = findFace(params.originatingFace);
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
  
  let editor = spatialCurveEditor(ctx.services.cadScene.workGroup, ctx.services.viewer, [CSys.ORIGIN]);

  
  function update(params) {
    // updateCSys(datum3D.csys, params, ctx.services.cadRegistry.findFace);
  }
  
  function dispose() {
    editor.dispose();
  }

  
  update(initialParams);
  
  return {
    update, dispose    
  }
}

export default {
  id: 'SPATIAL_CURVE',
  label: 'Edit Spatial Curve',
  icon: 'img/cad/plane',
  info: 'create/edit spatial curve',
  previewer,
  run: create,
  form: SpatialCurveWizard,
  schema: spatialCurveOpSchema  
};



