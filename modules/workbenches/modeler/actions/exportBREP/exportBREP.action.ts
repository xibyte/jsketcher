import {MShell} from "cad/model/mshell";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {ActionDefinition} from "cad/actions/actionSystemBundle";
import { MEdge } from "cad/model/medge";
import icon from "./EXPORT.svg";


interface ExportBREPParams {
  targetBody: MShell | MEdge;
}

export const ExportBREP: any = {
  id: 'EXPORT_BREP',
  label: 'EXPORT BREP',
  icon: icon,
  info: 'Export BREP file containing selected bodies',
  path:__dirname,
  run: async (params: any, ctx: ApplicationContext) => {
    throw 'EXPORT_BREP operation is not yet implemented with native engine';
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

function downloadBlob(data, fileName, mimeType) {
  const blob = new Blob([data], {
    type: mimeType
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function() {
    return window.URL.revokeObjectURL(url);
  }, 1000);
}

function downloadURL(data, fileName) {
  const a = document.createElement('a');
  a.href = data;
  a.id = "MyDownload"
  a.download = fileName;
  document.body.appendChild(a);
  a.style.display = 'none';
  a.click();
  a.remove();
}