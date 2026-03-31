import { ApplicationContext } from "cad/context";
import CSys from "math/csys";
import Vector, { AXIS } from "math/vector";
import DatumObject3D from "../../../../web/app/cad/craft/datum/datumObject";
import {MBrepShell} from "../../../../web/app/cad/model/mshell";
import * as BREPPrimitives from "brep/brep-primitives";


export function testVertexMoving(ctx: ApplicationContext) {


  function step(cornerPoint) {

    ctx.craftService.models$.update((models) => {
      const shell = BREPPrimitives.box(500, 500, 500);
      const mShell = new MBrepShell(shell);
      return [mShell];
    });

  }

  const datum3D = new DatumObject3D(
    new CSys(new Vector(0,0,500), AXIS.X.copy(), AXIS.Y.copy(), AXIS.Z.copy()),
    ctx.services.viewer);

  datum3D.onMove = (begin, end, delta) => {
    step(end);
  };
  ctx.services.cadScene.workGroup.add(datum3D);

  step(new Vector(0, 0, 500));

}
