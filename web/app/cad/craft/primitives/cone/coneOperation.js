import {Mesh, ConeGeometry, Matrix4, CylinderGeometry} from 'three';
import schema from './coneOpSchema';
import ConeWizard from './ConeWizard';
import {IMAGINARY_SURFACE_MATERIAL} from '../../../preview/scenePreviewer';
import CSys from 'math/csys';
import * as SceneGraph from 'scene/sceneGraph';
import datumConsumingOperation from '../datumConsumingOperation';
import {assignBooleanParams} from '../booleanOptionHelper';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createCone(
    assignBooleanParams({
      csys,
      radius: params.radius,
      frustum: params.frustum,
      height: params.height
    }, params, services.cadRegistry.getAllShells)
  ));
}

function previewer(ctx, initialParams) {
  let mDatum = initialParams.datum && ctx.services.cadRegistry.findDatum(initialParams.datum);
  let cs = mDatum ? mDatum.csys : CSys.ORIGIN;
  let o = cs.origin;

  let mesh = null;
  let auxMatrix = new Matrix4();
  
  function update(params) {
    
    dispose();

    let geometry;
    if (params.frustum) {
      geometry = new CylinderGeometry(params.frustum, params.radius, params.height, 50, 1);
    } else {
      geometry = new ConeGeometry(params.radius, params.height, 50, 1)  
    }
    
    mesh = new Mesh(geometry, IMAGINARY_SURFACE_MATERIAL);
    mesh.matrixAutoUpdate = false;
    
    mesh.matrix.set(
      cs.x.x, cs.y.x, cs.z.x, o.x,
      cs.x.y, cs.y.y, cs.z.y, o.y,
      cs.x.z, cs.y.z, cs.z.z, o.z,
      0, 0, 0, 1
    );
    auxMatrix.set(
      1, 0, 0, 0,
      0, 1, 0, params.height * 0.5,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    mesh.matrix.multiplyMatrices(mesh.matrix, auxMatrix);
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
  id: 'CONE',
  label: 'Cone',
  icon: 'img/cad/cone',
  info: 'creates new cone',
  paramsInfo: ({radius, frustum, height}) => `(${radius}, ${frustum}, ${height})`,
  previewer,
  form: ConeWizard,
  schema,
  run
};

