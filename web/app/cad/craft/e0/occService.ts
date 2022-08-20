import {ApplicationContext} from "cad/context";
import {OCCCommandInterface, OCI} from "cad/craft/e0/occCommandInterface";
import {createOCCIO, OCCIO} from "cad/craft/e0/occIO";
import {createOCCUtils, OCCUtils} from "cad/craft/e0/OCCUtils";
import {createOCCEngineInterface} from "cad/craft/e0/occEngineInterface";

export interface OCCService {

  io: OCCIO;

  commandInterface: OCCCommandInterface;

  utils: OCCUtils,

  engineInterface: any
}

export function createOCCService(ctx: ApplicationContext): OCCService {

  const oci = OCI;

  return {

    io: createOCCIO(ctx),

    commandInterface: oci,

    engineInterface: createOCCEngineInterface(oci),

    utils: createOCCUtils(ctx)

  }


}