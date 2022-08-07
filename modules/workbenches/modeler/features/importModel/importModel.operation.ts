import {ApplicationContext} from "context";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {LocalFile, LocalFileAdapter} from "ui/components/controls/FileControl";
import CadError from "../../../../../web/app/utils/errors";
import {parseStringPromise} from 'xml2js';
import {importStepFile} from "cad/craft/e0/interact";
import {clone} from "gems/objects";
import JSZip from "jszip";

interface ImportModelParams {
  file: LocalFileAdapter;
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
    let rawContent = params.file.rawContent();
    //console.log(params.file.content);
    //console.log(rawContent);

    if (FileName.endsWith("BRP") || FileName.endsWith("BREP")) {
      //FreeCAD some times omits this text from the top of BRP files
      //as part of the brp files stored in the .FCStf file archive format
      console.log(rawContent);
      if (!rawContent.startsWith("DBRep_DrawableShape")) {
        rawContent = `DBRep_DrawableShape\n` + rawContent;
      }

      FS.writeFile("newBREPobject", rawContent);
      oci.readbrep("newBREPobject", "newBREPobject");
      returnObject.created.push(occ.io.getShell("newBREPobject"));
    } else if (FileName.endsWith("FCSTD")) {

      const zipContents = (await JSZip.loadAsync(params.file.base64Content(), { base64: true })).files;
      const xmlFreeCADData = await zipContents["Document.xml"].async("string");

      let DecodedXmlFreeCADData = (clone(await parseStringPromise(xmlFreeCADData))).Document.ObjectData[0].Object;

      for (const itemToLookAt in DecodedXmlFreeCADData) {
        const flattenedObject = flattenJSON(DecodedXmlFreeCADData[itemToLookAt]);
        let importBrepFlag = false;
        let importBrepShapeName = "";
        let visiblePropertyName = "";
        for (const propertyToLookAt in flattenedObject) {

          if (propertyToLookAt.includes("Part.0.$.file")) importBrepShapeName = flattenedObject[propertyToLookAt];
          if (importBrepShapeName !== "PartShape.brp"){
            if (propertyToLookAt.includes("$.name") && flattenedObject[propertyToLookAt] == "Visibility") {
              let propToCheck = await propertyToLookAt.replace(".$.name", ".Bool.0.$.value");
              let shouldItImport = await flattenedObject[propToCheck];
              console.log(shouldItImport, importBrepShapeName);
              //alert(shouldItImport);
              if (shouldItImport == "true") {
                try {
                  await FS.writeFile(importBrepShapeName, `DBRep_DrawableShape\n` + await zipContents[importBrepShapeName].async("string"));
                  await oci.readbrep(importBrepShapeName, importBrepShapeName);
                  returnObject.created.push(occ.io.getShell(importBrepShapeName));
                  console.log(importBrepShapeName);
                } catch (e) {
                  console.log(e)
                }
              }
            }
          }
        }
      }

    } else if (FileName.endsWith("STEP") || FileName.endsWith("STP")) {

      //step Import
      FS.writeFile("newStepFile", rawContent);
      importStepFile("newStepObject", "newStepFile", true);
      returnObject.created.push(occ.io.getShell("newStepObject"));

    } else if (FileName.endsWith("IGES") || FileName.endsWith("IGS")) {

      //IGES import
      FS.writeFile("newIgesObject", rawContent);
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
  for (let key of Object.keys(obj)) {
    if (typeof obj[key] !== 'object') {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    }
  }
  return res;
};