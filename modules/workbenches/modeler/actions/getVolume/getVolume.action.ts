import {MShell} from "cad/model/mshell";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {ActionDefinition} from "cad/actions/actionSystemBundle";


interface getVolumeParams {
  targetBody: MShell;
}

export const GetVolume: any = {
  id: 'GET_VOLUME',
  label: 'VOLUME',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  path:__dirname,
  run: (params: getVolumeParams, ctx: ApplicationContext) => {

    let occ = ctx.services.OCCService;
    const oci = occ.commandInterface;

    alert();

    return;
  },



  form: [
    {
      type: 'selection',
      name: 'targetBody',
      capture: [EntityKind.SHELL],
      label: 'Body',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
