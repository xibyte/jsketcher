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
    throw 'GET_INFO operation is not yet implemented with native engine';
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
