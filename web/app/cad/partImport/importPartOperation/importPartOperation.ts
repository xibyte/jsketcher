import {GrCloudDownload} from "react-icons/gr";
import {ImportPartForm} from "./ImportPartForm";
import importPartSchema from "./importPartSchema";
import {OperationDescriptor, OperationResult} from "../../craft/operationPlugin";
import CSys from "../../../math/csys";
import {MDatum} from "../../model/mdatum";
import {ApplicationContext} from "context";

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


function runImportOperation(params: ImportPartOperationParams, ctx: ApplicationContext):  OperationResult {


  const {cadRegistry, partImportService} = ctx;

  let mDatum = params.datum && cadRegistry.findDatum(params.datum);


  const res =  {
    consumed: [],
    created: []
  };

  // partImportService.resolvePartReference(params.);

  if (mDatum) {

    if (params.consumeDatum) {
      res.consumed.push(mDatum);
    }

  }

  return res;
}