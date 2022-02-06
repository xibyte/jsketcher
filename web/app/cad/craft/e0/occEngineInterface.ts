import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";
import {MShell} from "cad/model/mshell";
import {MObject} from "cad/model/mobject";
import {Interrogate} from "cad/craft/e0/interact";
import {readShellEntityFromJson} from "cad/scene/wrappers/entityIO";
import {createOCCSketchLoader, OCCSketchLoader} from "cad/craft/e0/occSketchLoader";

export function createOCCEngineInterface(oci: OCCCommandInterface) {

  return {
    io: {
      pushModel: (params: {
        name: string, operand: number,
      }) => oci.EngineCommand('io.pushModel', params)
    }
  }

}