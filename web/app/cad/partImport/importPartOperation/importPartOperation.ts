import {GrCloudDownload} from "react-icons/gr";
import {ImportPartForm} from "./ImportPartForm";
import importPartSchema from "./importPartSchema";
import {OperationDescriptor} from "../../craft/operationPlugin";
import {ApplicationContext} from "context";
import {OperationResult} from "../../craft/craftPlugin";

export interface ImportPartOperationParams {
  partRef: string,
  datum: string,
  consumeDatum: boolean;
}

export const ImportPartOperation: OperationDescriptor<ImportPartOperationParams> = {

  id: 'IMPORT_PART',
  label: 'import part',
  icon: GrCloudDownload,
  info: 'opens a dialog to import parts from the catalog',
  paramsInfo: ({partRef}) => partRef,
  previewGeomProvider: null,
  run: runImportOperation,
  form: ImportPartForm,
  schema: importPartSchema
};


function runImportOperation(params: ImportPartOperationParams, ctx: ApplicationContext):  Promise<OperationResult> {

  const {cadRegistry, remotePartsService} = ctx;

  let mDatum = params.datum && cadRegistry.findDatum(params.datum);

  const res =  {
    consumed: [],
    created: []
  };

  return remotePartsService.resolvePartReference(params.partRef).then(parts => {

    parts.forEach(part => res.created.push(part));

    if (mDatum) {

      if (params.consumeDatum) {
        res.consumed.push(mDatum);
      }

    }

    return res;

  });

}