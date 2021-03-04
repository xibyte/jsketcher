import {ImportStepForm} from "./ImportStepForm";
import importStepSchema from "./importStepSchema";
import {OperationDescriptor} from "../../craft/operationPlugin";
import {ApplicationContext} from "context";
import {OperationResult} from "../../craft/craftPlugin";
import {GiLunarModule} from "react-icons/gi";
import {BiCubeAlt} from "react-icons/bi";
import {checkHttpResponseStatus} from "network/checkHttpResponseStatus";
import { LocalFile } from "ui/components/controls/FileControl";
import { ImportStepLocalForm } from "./ImportStepLocalForm";
import { string } from "prop-types";

export interface ImportStepOperationParams {
  url: string,
}

export interface ImportStepFromLocalOperationParams {

  file: LocalFile;

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

export const ImportStepFromLocalFileOperation: OperationDescriptor<ImportStepFromLocalOperationParams> = {

  id: 'IMPORT_STEP_LOCAL_FILE',
  label: 'import local step file',
  icon: BiCubeAlt,
  info: 'import step file from local file',
  paramsInfo: ({file}) => file && file.fileName,
  previewGeomProvider: null,
  run: importStepLocalFile,
  form: ImportStepLocalForm,
  schema: {
    file: {
      type: 'object',
      schema: {
        fileName: {
          type: 'string',
        },
        constent: {
          type: 'string',
        }
      }
    }
  }
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

function importStepLocalFile(params: ImportStepFromLocalOperationParams, ctx: ApplicationContext):  Promise<OperationResult> {

  const {cadRegistry, remotePartsService} = ctx;

  console.log(params.file.content);
  FS.writeFile('/tmp/test', params.file.content);

  return ctx.services.craftEngine.stepImport({
    file: '/tmp/test'
  });

}