import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";

interface BooleanParams {
  tools: [];
  boolean: BooleanDefinition
}

const BooleanOperation: OperationDescriptor<BooleanParams> = {
  id: 'boolean_tool',
  label: 'Boolean',
  icon: 'img/cad/Boolean',
  info: 'Booleans 2D sketch',
  paramsInfo: ({tools, boolean}) => `(${r(tools)} ${r(boolean)})`,
  run: (params: BooleanParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    console.log(params.tools, params.boolean);

    return occ.utils.applyBooleanModifier(params.tools, params.boolean);

  },
  form: [
    {
      type: 'boolean',
      name: 'boolean',
      label: 'Targets',
      optional: true,
      defaultValue: 'UNION'
    },
    {
      type: 'selection',
      name: 'tools',
      capture: [EntityKind.SHELL],
      label: 'Tools',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}

export default BooleanOperation;