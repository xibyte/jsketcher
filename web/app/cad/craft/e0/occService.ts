import {CoreContext} from "context";
import {OCCCommandInterface, OCI} from "cad/craft/e0/occCommandInterface";
import {createOCCIO, OCCIO} from "cad/craft/e0/occIO";
import {createOCCUtils, OCCUtils} from "cad/craft/e0/OCCUtils";

export interface OCCService {

  io: OCCIO;

  commandInterface: OCCCommandInterface;

  utils: OCCUtils
}

export function createOCCService(ctx: CoreContext): OCCService {

  const oci = OCI;

  return {

    io: createOCCIO(oci),

    commandInterface: oci,

    utils: createOCCUtils(ctx)

  }


}