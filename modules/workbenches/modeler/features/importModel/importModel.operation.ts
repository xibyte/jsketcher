import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { param } from 'cypress/types/jquery';
import { MObject } from 'cad/model/mobject';
import { LocalFile } from "ui/components/controls/FileControl";
import CadError from "../../../../../web/app/utils/errors";

interface ImportModelParams {
  file: LocalFile;
}

export const ImportModelOpperation: OperationDescriptor<ImportModelParams> = {
  id: 'IMPORT_MODEL',
  label: 'Import',
  icon: 'img/cad/intersection',
  info: 'Imports STEP, BREP or FCStd file',
  paramsInfo: ({ }) => `()`,
  run: async (params: ImportModelParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let returnObject = { created: [], consumed: [] };

    const FileName = params.file.fileName.toUpperCase()

    if (FileName.endsWith("BRP") || FileName.endsWith("BREP")) {
      alert("Importing BREP file");

      if (!params.file.content.startsWith("DBRep_DrawableShape")) {
        params.file.content = `DBRep_DrawableShape\n` + params.file.content;
      }

      await FS.writeFile("newStepObject", await (params.file.content));
      oci.readbrep("newStepObject", "newStepObject");
      returnObject.created.push(occ.io.getShell("newStepObject"));
    } else {
      throw new CadError({
        kind: CadError.KIND.INVALID_INPUT,
        code: 'File type not supported at this time'
      });


    }


    return returnObject;

  },
  form: [
    {
      type: 'file',
      name: 'file',
      label: 'Select File',

    },
  ],
}
