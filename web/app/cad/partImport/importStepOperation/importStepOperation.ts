import {ImportStepForm} from "./ImportStepForm";
import importStepSchema from "./importStepSchema";
import {OperationDescriptor} from "../../craft/operationPlugin";
import {ApplicationContext} from "context";
import {OperationResult} from "../../craft/craftPlugin";
import {GiLunarModule} from "react-icons/gi";
import {checkHttpResponseStatus} from "network/checkHttpResponseStatus";

export interface ImportStepOperationParams {
  url: string,
}

export const ImportStepOperation: OperationDescriptor<ImportStepOperationParams> = {

  id: 'IMPORT_STEP_FILE',
  label: 'import step file',
  icon: GiLunarModule,
  info: 'import step file from external url',
  paramsInfo: ({url}) => url,
  previewGeomProvider: null,
  run: importStepFile,
  form: ImportStepForm,
  schema: importStepSchema
};


function importStepFile(params: ImportStepOperationParams, ctx: ApplicationContext):  Promise<OperationResult> {

  const {cadRegistry, remotePartsService} = ctx;

  return fetch(params.url).then(checkHttpResponseStatus).then(res => res.text()).then(data => {

    console.log(data);
    FS.writeFile('/tmp/test', data);

    return ctx.services.craftEngine.stepImport({
      file: '/tmp/test'
    });
  })


}