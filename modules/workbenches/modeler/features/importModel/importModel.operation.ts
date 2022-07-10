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
    //console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let returnObject = { created: [], consumed: [] };


    const FileName = params.file.fileName.toUpperCase();
    let fileToRead = await atob(await params.file.content.slice(await params.file.content.indexOf(',') + 1));
    //console.log(params.file.content);
    //console.log(fileToRead);

    if (FileName.endsWith("BRP") || FileName.endsWith("BREP")) {
      //FreeCAD some times omits this text from the top of BRP files
      //as part of the brp files stored in the .FCStf file archive format
      if (!fileToRead.startsWith("DBRep_DrawableShape")) {
        fileToRead = `DBRep_DrawableShape\n` + fileToRead;
      }

      FS.writeFile("newBREPobject", (fileToRead));
      oci.readbrep("newBREPobject", "newBREPobject");
      returnObject.created.push(occ.io.getShell("newBREPobject"));
    } else if (FileName.endsWith("FCSTD")) {
      var JSZip = require("jszip");

      const zipContents = await (await JSZip.loadAsync(btoa(fileToRead), { base64: true })).files;
      var xmlFreeCADData = await zipContents["Document.xml"].async("string");

      let DecodedXmlFreeCADData = (JSON.parse(JSON.stringify(await parseStringPromise(xmlFreeCADData)))).Document.ObjectData[0].Object;
      //console.log(DecodedXmlFreeCADData);


      for (const itemToLookAt in DecodedXmlFreeCADData) {
        const flattenedObject = flattenJSON(DecodedXmlFreeCADData[itemToLookAt]);
        let importBrepFlag = false;
        let importBrepShapeName = "";
        let visiblePropertyName = "";
        for (const propertyToLookAt in flattenedObject) {
          console.log(propertyToLookAt + " = " + flattenedObject[propertyToLookAt]);
          if (propertyToLookAt.includes("Part.0.$.file")) importBrepShapeName = flattenedObject[propertyToLookAt];
          if (propertyToLookAt.includes("$.name") && flattenedObject[propertyToLookAt] == "Visibility") {
            let propToCheck = propertyToLookAt.replace(".$.name", ".Bool.0.$.value");
            if (flattenedObject[propToCheck] == "true") importBrepFlag = true;
          }

        }
        if (importBrepFlag == true) {
          FS.writeFile(importBrepShapeName, `DBRep_DrawableShape\n` + await zipContents[importBrepShapeName].async("string"));
          oci.readbrep(importBrepShapeName, importBrepShapeName);
          returnObject.created.push(occ.io.getShell(importBrepShapeName));
        }
      }

      // for (const property in zipContents) {
      //   if (property.endsWith("brp")) {
      //     FS.writeFile(property, `DBRep_DrawableShape\n` + await zipContents[property].async("string"));
      //     oci.readbrep(property, property);
      //     returnObject.created.push(occ.io.getShell(property));
      //   }
      // }
      //console.log(zipContents);
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

const flattenJSON = (obj = {}, res = {}, extraKey = '') => {
  for (key in obj) {
    if (typeof obj[key] !== 'object') {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    };
  };
  return res;
};