import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { param } from 'cypress/types/jquery';
import { MObject } from 'cad/model/mobject';
import { LocalFile } from "ui/components/controls/FileControl";
import CadError from "../../../../../web/app/utils/errors";
import { parseStringPromise } from 'xml2js';
import * as jszip from "jszip";


interface ImportModelParams {
  file: LocalFile;
}

export const ImportModelOpperation: OperationDescriptor<ImportModelParams> = {
  id: 'IMPORT_MODEL',
  label: 'Import',
  icon: 'img/cad/import',
  info: 'Imports BREP, STEP, IGES or FCStd file',
  paramsInfo: ({ }) => `()`,
  run: async (params: ImportModelParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let returnObject = { created: [], consumed: [] };

    console.log(params.file.content);

    const FileName = params.file.fileName.toUpperCase()

    if (FileName.endsWith("BRP") || FileName.endsWith("BREP")) {

      //FreeCAD some times omits this text from the top of BRP files
      //as part of the brp files stored in the .FCStf file archive format
      if (!params.file.content.startsWith("DBRep_DrawableShape")) {
        params.file.content = `DBRep_DrawableShape\n` + params.file.content;
      }

      FS.writeFile("newBREPobject",  (params.file.content));
      oci.readbrep("newBREPobject", "newBREPobject");
      returnObject.created.push(occ.io.getShell("newBREPobject"));
    } else if (FileName.endsWith("FCSTD")) {

      //Add code here to extract zip file

      let xmlFreeCADData = "";
      //add code here to read contents of GuiDocument.xml in to xmlFreeCADData

      let DecodedXmlFreeCADData = await parseStringPromise(xmlFreeCADData);
      DecodedXmlFreeCADData = (JSON.parse(JSON.stringify(DecodedXmlFreeCADData)));
      console.log(JSON.stringify(DecodedXmlFreeCADData));

      //add code here to determin what specfic brp files from within 
      //the archive have the property "Visibility" set as true. 

      //Only import objects that have "Visisbility" set as true
      //withthe same code as above for importing .brp type files.

    } else if (FileName.endsWith("STEP") || FileName.endsWith("STP")) {

      //step Import
      FS.writeFile("newStepObject", (params.file.content));
      oci.stepread("newStepObject", "newStepObject");
      returnObject.created.push(occ.io.getShell("newStepObject"));

    } else if (FileName.endsWith("IGES") || FileName.endsWith("IGS")) {

      //IGES import
      FS.writeFile("newIgesObject", (params.file.content));
      oci.igesread("newIgesObject", "newIgesObject");
      returnObject.created.push(occ.io.getShell("newIgesObject"));

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

