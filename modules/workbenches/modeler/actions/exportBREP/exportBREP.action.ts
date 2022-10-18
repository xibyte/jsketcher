import {MShell} from "cad/model/mshell";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {ActionDefinition} from "cad/actions/actionSystemBundle";
import { MEdge } from "cad/model/medge";


interface ExportBREPParams {
  targetBody: MShell | MEdge;
}

export const ExportBREP: any = {
  id: 'EXPORT_BREP',
  label: 'EXPORT BREP',
  icon: 'img/cad/extrude',
  info: 'EXPORT BREP FILE CONTAINING SELECTED BODIES',
  path:__dirname,
  run: async (params: Params, ctx: ApplicationContext) => {
    console.log("this is it", this)
    const occ = ctx.occService;
    const oci = occ.commandInterface;


    let resultingMessage = "";



   await params.targetBody.forEach(async (targetBody) => {
    console.log(targetBody);
      await oci.writebrep(targetBody, targetBody.id+".brp", "-binary", 0);
      //await oci.binsave(...targetBody, "myFile.brp");
      
      await downloadBlob(await FS.readFile(targetBody.id+".brp"), targetBody.id+".brp", 'application/octet-stream');
      
      //alert("yay");
    });






    resultingMessage = "yay";

    throw {userMessage: resultingMessage};
    return;
  },



  form: [
    {
      type: 'selection',
      name: 'targetBody',
      capture: [EntityKind.SHELL],
      label: 'Body',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}



var downloadBlob, downloadURL;

downloadBlob = function(data, fileName, mimeType) {
  var blob, url;
  blob = new Blob([data], {
    type: mimeType
  });
  url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function() {
    return window.URL.revokeObjectURL(url);
  }, 1000);
};

downloadURL = function(data, fileName) {
  var a;
  a = document.createElement('a');
  a.href = data;
  a.id = "MyDownload"
  a.download = fileName;
  document.body.appendChild(a);
  a.style = 'display: none';
  a.click();
  a.remove();
};