import DatumWizard from './CreateDatumWizard';
import schema from './createDatumOpSchema';
import DatumObject3D from '../datumObject';
import * as SceneGraph from 'scene/sceneGraph';
import CSys from 'math/csys';
import {MDatum} from '../../../model/mdatum';
import {roundInteractiveInput} from '../../wizard/roundUtils';
import {DatumParamsRenderer} from '../DatumParamsRenderer';
import {pointAsText} from 'renders';
import {applyRotation} from "cad/craft/datum/rotate/rotateDatumOperation";
import icon from "./DATUM.svg";

function updateCSys(csys, params, findFace) {
  csys.copy(CSys.ORIGIN);
  if (params.originatingFace) {
    const face = findFace(params.originatingFace);
    if (face) {
      csys.copy(face.csys);
    }
  }

  (params.rotations||[]).forEach(r => {
    const axis = csys[r.axis.toLowerCase()];
    applyRotation(csys, csys, r.angle, axis);
  });


  csys.origin.x += params.x;
  csys.origin.y += params.y;
  csys.origin.z += params.z;
}

function create(params, {cadRegistry}) {
  const csys = CSys.origin();
  updateCSys(csys, params, cadRegistry.findFace);

  return {
    consumed: [],
    created: [new MDatum(csys)]
  }
}

function previewer(ctx, initialParams, updateParams) {

  const datum3D = new DatumObject3D(CSys.origin(), ctx.services.viewer);

  datum3D.onMove = (begin, end, delta) => {
    updateParams(params => {
      
      let x = end.x;
      let y = end.y;
      let z = end.z;
      if (params.originatingFace) {
        const face = ctx.services.cadRegistry.findFace(params.originatingFace);
        if (face) {
          x -= face.csys.origin.x;
          y -= face.csys.origin.y;
          z -= face.csys.origin.z;
        }
      }
      params.x = roundInteractiveInput(x);
      params.y = roundInteractiveInput(y);
      params.z = roundInteractiveInput(z);
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

  const modifications = ctx.craftService.modifications$.value;
  const preDrag = modifications.hints?.preDrag;
  if (preDrag) {
    let axis;
    if ('X' === preDrag.axis) {
      axis = datum3D.csysObj.xAxis;
    } else if ('Y' === preDrag.axis) {
      axis = datum3D.csysObj.yAxis;
    } else if ('Z' === preDrag.axis) {
      axis = datum3D.csysObj.zAxis;
    }

    if (axis) {
      ctx.services.modelMouseEventSystem.dispatchMousedown(preDrag.event, [{object: axis.handle}]);
    }
  }

  return {
    update, dispose    
  }
}

export default {
  id: 'DATUM_CREATE',
  label: 'Datum',
  icon,
  info: 'originates a new datum from origin or off of a selected face',
  paramsInfoComponent: DatumParamsRenderer,
  paramsInfo: pointAsText,
  previewer,
  run: create,
  form: DatumWizard,
  schema
};



