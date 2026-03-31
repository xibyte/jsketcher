import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';

import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MEdge} from "cad/model/medge";
import {MObject} from "cad/model/mobject";
import {MShell} from "cad/model/mshell";
import { MBrepFace } from 'cad/model/mface';

interface FilletParams {
  edges: MEdge[] | MBrepFace[],
  size: number
  opperationType: 'Champher'|'Fillet'
}

export const FilletOperation: OperationDescriptor<any> = {
  id: 'FILLET_TOOL',
  label: 'Fillet/Chapher',
  icon: 'img/cad/fillet',
  info: 'Fillet/Champher',
  path:__dirname,
  paramsInfo: ({size, opperationType,}) => `(${r(size)} ${r(opperationType)}})`,
  run: (params: FilletParams, ctx: ApplicationContext) => {
    throw 'FILLET operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'edges',
      capture: [EntityKind.EDGE,EntityKind.FACE],
      label: 'edges',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      style: "dropdown",
      label: 'opperationType',
      name: 'opperationType',
      values: ["Fillet", "Champher"],
      defaultValue: "Fillet",
    },
    {
      type: 'number',
      label: 'size',
      name: 'size',
      defaultValue: 5,
    },
  ],
}

