import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import icon from "./SIMPLIFY.svg";
import { MShell } from 'cad/model/mshell';
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";

interface SimplifyParams {
  tools: MShell[];
}

export const SimplifyOperation: OperationDescriptor<SimplifyParams> = {
  id: 'SIMPLIFY',
  label: 'Simplify',
  icon,
  info: 'Simplify faces',
  path:__dirname,
  paramsInfo: ({tools, Simplify}) => `(${r(tools)} ${r(Simplify)})`,
  run: (params: SimplifyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const created = [];
    const consumed = [];


    params.tools.forEach((bodyToSimplify) => {
      const analyzer = new FromMObjectProductionAnalyzer([bodyToSimplify]);
      oci.fixshape("SimplifiedShell", bodyToSimplify);
      oci.unifysamedom("SimplifiedShell", "SimplifiedShell");

      created.push(occ.io.getShell("SimplifiedShell", analyzer));
      consumed.push(bodyToSimplify)
    });


    return {
      created,
      consumed
    };

  },
  form: [
    {
      type: 'selection',
      name: 'tools',
      capture: [EntityKind.SHELL],
      label: 'Body',
      optional: false,
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
