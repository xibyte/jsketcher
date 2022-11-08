import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MFace } from "cad/model/mface";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import icon from "./DELETE-FACE.svg";


interface DefeatureRemoveFaceParams {
  tools: MFace[];
}

export const DefeatureRemoveFaceOperation: OperationDescriptor<DefeatureRemoveFaceParams> = {
  id: 'DEFEATURE_REMOVE_FACE',
  label: 'Delete Face',
  icon: icon,
  info: 'Delete face helps defeating a model.',
  path: __dirname,
  paramsInfo: ({ tools }) => `(${r(tools)})`,
  run: (params: DefeatureRemoveFaceParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;
    const created = [];
    const consumed = [];

    consumed.push(params.tools[0].shell);
    const analyzer = new FromMObjectProductionAnalyzer(consumed);

    oci.removefeatures("resultingShape", params.tools[0].shell, ...params.tools);

    created.push(occ.io.getShell("resultingShape",analyzer));

    console.log(params.tools)
    //consumed.push(tools[0].)

    const returnObject = {
      created,
      consumed
    }
    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'tools',
      capture: [EntityKind.FACE],
      label: 'Tools',
      optional: false,
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
