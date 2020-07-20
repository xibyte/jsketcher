import {BoxGeometry, Matrix4, Mesh} from 'three';
import {IMAGINARY_SURFACE_MATERIAL} from '../../preview/scenePreviewer';
import CSys from 'math/csys';
import * as SceneGraph from 'scene/sceneGraph';

export default function primitivePreviewer(createThreePrimitiveGeometry, paramsToScales, shift) {
  return function previewer(ctx, initialParams) {

    let geometry = createThreePrimitiveGeometry();
    let mesh = new Mesh(geometry, IMAGINARY_SURFACE_MATERIAL);
    mesh.matrixAutoUpdate = false;
    SceneGraph.addToGroup(ctx.services.cadScene.workGroup, mesh);

    let auxMatrix = new Matrix4();

    function update(params) {
      let mDatum = params.datum && ctx.services.cadRegistry.findDatum(params.datum);
      let cs = mDatum ? mDatum.csys : CSys.ORIGIN;
      let o = cs.origin;

      let {dx, dy, dz} = paramsToScales(params);
      mesh.matrix.set(
        dx*cs.x.x, dy*cs.y.x, dz*cs.z.x, o.x,
        dx*cs.x.y, dy*cs.y.y, dz*cs.z.y, o.y, 
        dx*cs.x.z, dy*cs.y.z, dz*cs.z.z, o.z,
        0, 0, 0, 1
      );
      
      if (shift) {
        auxMatrix.set(
          1, 0, 0, shift[0],
          0, 1, 0, shift[1],
          0, 0, 1, shift[2],
          0, 0, 0, 1
        );
        mesh.matrix.multiplyMatrices(mesh.matrix, auxMatrix);
      }

      mesh.matrixWorldNeedsUpdate = true
    }

    function dispose() {
      SceneGraph.removeFromGroup(ctx.services.cadScene.workGroup, mesh);
      geometry.dispose();
    }

    update(initialParams);

    return {
      update, dispose
    }
  }
}