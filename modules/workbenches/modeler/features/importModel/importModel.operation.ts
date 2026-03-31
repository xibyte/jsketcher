import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {LocalFileAdapter} from "ui/components/controls/FileControl";
import CadError from "utils/errors";
import icon from "./IMPORT.svg";

interface ImportModelParams {
  file: LocalFileAdapter;
}

export const ImportModelOperation: OperationDescriptor<ImportModelParams> = {
  id: 'IMPORT_MODEL',
  label: 'Import',
  icon: icon,
  info: 'Imports BREP, STEP, IGES or FCStd file',
  path:__dirname,
  paramsInfo: () => `()`,
  run: async (params: ImportModelParams, ctx: ApplicationContext) => {
    throw 'IMPORT_MODEL operation is not yet implemented with native engine';
  },

  form: [
    {
      type: 'file',
      name: 'file',
      label: 'Select File',

    },
  ],
}

const flattenJSON = (obj = {}, res = {}, extraKey = '') => {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] !== 'object') {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    }
  }
  return res;
};