import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";
import {MShell} from "cad/model/mshell";
import {MObject} from "cad/model/mobject";
import {Interrogate} from "cad/craft/e0/interact";
import {readShellEntityFromJson} from "cad/scene/wrappers/entityIO";
import {createOCCSketchLoader, OCCSketchLoader} from "cad/craft/e0/occSketchLoader";

export interface OCCIO {

  getShell(name: string, consumed?: MShell[]): MShell;

  pushModel(model: MObject, name: string);

  anchorModel(name: string);

  cleanupRegistry();

  sketchLoader: OCCSketchLoader
}

export function createOCCIO(oci: OCCCommandInterface): OCCIO {

  function getShell(shapeName: string, consumed: MShell[]): MShell {
    const shapeJson = Interrogate(shapeName);
    return readShellEntityFromJson(shapeJson, consumed);
  }

  function pushModel(model: MObject, name: string) {

  }

  function anchorModel() {

  }

  function cleanupRegistry() {

  }


  return {
    getShell, pushModel, anchorModel, cleanupRegistry,
    sketchLoader: createOCCSketchLoader(oci)
  }

}