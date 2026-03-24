import {TbLayersLinked, TbLayersUnion, TbLayersIntersect, TbLayersSubtract} from 'react-icons/tb';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface BooleanParams {
  tools: [];
  boolean: BooleanDefinition;
}

export const BooleanOperation: OperationDescriptor<BooleanParams> = {
  id: 'BOOLEAN',
  label: 'Boolean',
  icon: TbLayersLinked,
  info: 'Booleans 2D sketch',
  path: __dirname,
  paramsInfo: ({tools, boolean}) => `(${r(tools)} ${r(boolean)})`,
  run: (params: BooleanParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    return occ.utils.applyBooleanModifier(params.tools, params.boolean);
  },
  form: [
    {
      type: 'selection',
      name: 'tools',
      capture: [EntityKind.SHELL],
      label: 'Tools',
      optional: false,
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'Targets',
      optional: true,
      defaultValue: "UNION",
    },
  ],
  masking: [
    {
      id: 'UNION',
      label: 'Union',
      icon: TbLayersUnion,
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'UNION',
          simplify: true
        }
      }
    },
    {
      id: 'SUBTRACT',
      label: 'Subtract',
      icon: TbLayersSubtract,
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'SUBTRACT',
          simplify: true
        }
      }
    },
    {
      id: 'INTERSECT',
      label: 'Intersect',
      icon: TbLayersIntersect,
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'INTERSECT',
          simplify: true
        }
      }
    }
  ],
}