import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {LocalFileAdapter} from "ui/components/controls/FileControl";
import CadError from "utils/errors";
import {parseString} from 'browser-xml2js';
import {importStepFile} from "cad/craft/e0/interact";
import {clone} from "gems/objects";
import JSZip from "jszip/dist/jszip.min";

interface ImportModelParams {
  file: LocalFileAdapter;
}

const parseStringAsync = (xml) => new Promise((resolve, reject) => {
  parseString(xml, function (err, result) {
    if (err) {
      reject(err)
    } else {
      resolve(result);
    }
  });
});

export const ImportModelOperation: OperationDescriptor<ImportModelParams> = {
  id: 'IMPORT_MODEL',
  label: 'Import',
  icon: 'img/cad/import',
  info: 'Imports BREP, STEP, IGES or FCStd file',
  path:__dirname,
  paramsInfo: () => `()`,
  run: async (params: ImportModelParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const returnObject = { created: [], consumed: [] };


    const FileName = params.file.fileName.toUpperCase();
    let rawContent = params.file.rawContent();

    if (FileName.endsWith("BRP") || FileName.endsWith("BREP")) {
      //FreeCAD some times omits this text from the top of BRP files
      //as part of the brp files stored in the .FCStf file archive format
      if (!rawContent.startsWith("DBRep_DrawableShape")) {
        rawContent = `DBRep_DrawableShape\n` + rawContent;
      }

      FS.writeFile("newBREPobject", rawContent);
      oci.readbrep("newBREPobject", "newBREPobject");
      returnObject.created.push(occ.io.getShell("newBREPobject"));
    } else if (FileName.endsWith("FCSTD")) {

      const zipContents = (await JSZip.loadAsync(params.file.base64Content(), { base64: true })).files;
      const xmlFreeCADData = await zipContents["Document.xml"].async("string");

      const DecodedXmlFreeCADData = (clone(await parseStringAsync(xmlFreeCADData))).Document.ObjectData[0].Object;

      for (const itemToLookAt in DecodedXmlFreeCADData) {
        const flattenedObject = flattenJSON(DecodedXmlFreeCADData[itemToLookAt]);
        let importBrepShapeName = "";
        const visiblePropertyName = "";
        for (const propertyToLookAt in flattenedObject) {
          if (propertyToLookAt.includes("Part.0.$.file")) importBrepShapeName = flattenedObject[propertyToLookAt];
          if (importBrepShapeName !== "PartShape.brp"){
            if (propertyToLookAt.includes("$.name") && flattenedObject[propertyToLookAt] == "Visibility") {
              const propToCheck = propertyToLookAt.replace(".$.name", ".Bool.0.$.value");
              const shouldItImport = flattenedObject[propToCheck];
              if (shouldItImport == "true") {
                try {
                  const zipBrepContent = zipContents[importBrepShapeName];
                  if (!zipBrepContent) {
                    continue;
                  }
                  const zipContent = await zipBrepContent.async("string");
                  FS.writeFile(importBrepShapeName, `DBRep_DrawableShape\n` + zipContent);
                  oci.readbrep(importBrepShapeName, importBrepShapeName);
                  returnObject.created.push(occ.io.getShell(importBrepShapeName));
                } catch (e) {
                  console.warn(e)
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

      throw new CadError({
        kind: CadError.KIND.INVALID_INPUT,
        code: 'IGES is not supported yet'
      });

      // //IGES import
      // FS.writeFile("newIgesObject", rawContent);
      // oci.readbrep()igesread("newIgesObject", "newIgesObject");
      // returnObject.created.push(occ.io.getShell("newIgesObject"));

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
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] !== 'object') {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    }
  }
  return res;
};