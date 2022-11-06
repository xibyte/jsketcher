import {MShell} from "cad/model/mshell";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import { MEdge } from "cad/model/medge";
import NurbsCurve from "geom/curves/nurbsCurve";


interface GetInfoParams {
  targetBody: MShell | MEdge;
  brepEdge: MEdge;
}

export const GetInfo: any = {
  id: 'GET_INFO',
  label: 'OBJECT INFO',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  path:__dirname,
  run: (params: GetInfoParams, ctx: ApplicationContext) => {
    console.log("this is it", this)
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const targetBody = params.targetBody;

    let resultingMessage = "";


    if (targetBody instanceof MEdge){
      resultingMessage = "Edge Length = "+ (targetBody.brepEdge.curve.impl as NurbsCurve).verb.length().toFixed(4);
    }
    if (targetBody.TYPE === EntityKind.SHELL){
      const listOfOutputs = [];

      const out_old = out;
      try {
        out = function(msg) {
          listOfOutputs.push(msg);
          //alert(JSON.stringify(msg));
          out_old(msg);
        }

        oci.vprops(params.targetBody);

      } finally {
        out = out_old;
      }

      const resultingVolumeArray = listOfOutputs.filter(function (str) {  return str.includes("Mass") });
      resultingMessage = "Volume = " + resultingVolumeArray[0].trim().replace(' ', '').replace("Mass:","").trim();
    }

    throw {userMessage: resultingMessage};
    return;
  },



  form: [
    {
      type: 'selection',
      name: 'targetBody',
      capture: [EntityKind.SHELL, EntityKind.EDGE],
      label: 'Body',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
