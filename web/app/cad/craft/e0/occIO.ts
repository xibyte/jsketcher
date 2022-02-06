import {OCI} from "cad/craft/e0/occCommandInterface";
import {MShell} from "cad/model/mshell";
import {MObject} from "cad/model/mobject";
import {Interrogate} from "cad/craft/e0/interact";
import {readShellEntityFromJson} from "cad/scene/wrappers/entityIO";
import {createOCCSketchLoader, OCCSketchLoader} from "cad/craft/e0/occSketchLoader";
import {CoreContext} from "context";

export interface OCCIO {

  getShell(name: string, consumed?: MShell[]): MShell;

  pushModel(model: MObject, name: string);

  cleanupRegistry();

  sketchLoader: OCCSketchLoader
}

export function createOCCIO(ctx: CoreContext): OCCIO {

  function getShell(shapeName: string, consumed: MShell[]): MShell {
    const shapeJson = Interrogate(shapeName);
    return readShellEntityFromJson(shapeJson, consumed);
  }

  function pushModel(model: MObject, name: string) {
    const ptr = model.brepShell?.data?.externals?.ptr;
    if (!ptr) {
      return false;
    }
    ctx.occService.engineInterface.io.pushModel({
      name,
      operand: ptr
    });
    return true;
  }

  function cleanupRegistry() {

  }


  return {
    getShell, pushModel, cleanupRegistry,
    sketchLoader: createOCCSketchLoader(OCI)
  }

}