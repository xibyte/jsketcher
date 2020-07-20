import {Mesh, TorusGeometry} from 'three';
import schema from './torusOpSchema';
import TorusWizard from './TorusWizard';
import {IMAGINARY_SURFACE_MATERIAL} from '../../../preview/scenePreviewer';
import CSys from 'math/csys';
import * as SceneGraph from 'scene/sceneGraph';
import datumConsumingOperation from '../datumConsumingOperation';
import {assignBooleanParams} from '../booleanOptionHelper';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createTorus(    
    assignBooleanParams({
      csys,
      radius: params.radius,
      tube: params.tube
    }, params, services.cadRegistry.getAllShells)
  ));
}

function previewer(ctx, initialParams) {
  let mDatum = initialParams.datum && ctx.services.cadRegistry.findDatum(initialParams.datum);
  let cs = mDatum ? mDatum.csys : CSys.ORIGIN;
  let o = cs.origin;

  let mesh = null;
  
  function update(params) {
    
    dispose();
    
    mesh = new Mesh(new TorusGeometry(params.radius, params.tube, 50, 50), IMAGINARY_SURFACE_MATERIAL);
    mesh.matrixAutoUpdate = false;

    mesh.matrix.set(
      cs.x.x, cs.y.x, cs.z.x, o.x,
      cs.x.y, cs.y.y, cs.z.y, o.y,
      cs.x.z, cs.y.z, cs.z.z, o.z,
      0, 0, 0, 1
    );
    
    mesh.matrixWorldNeedsUpdate = true;

    SceneGraph.addToGroup(ctx.services.cadScene.workGroup, mesh);
  }

  function dispose() {
    if (mesh !== null ) {
      SceneGraph.removeFromGroup(ctx.services.cadScene.workGroup, mesh);
      mesh.geometry.dispose();
      mesh = null;
    }
  }

  update(initialParams);

  return {
    update, dispose
  }
}

export default {
  id: 'TORUS',
  label: 'Torus',
  icon: 'img/cad/torus',
  info: 'creates new torus',
  paramsInfo: ({radius, tube}) => `(${radius} - ${tube})`,
  previewer,
  form: TorusWizard,
  schema,
  run
};

