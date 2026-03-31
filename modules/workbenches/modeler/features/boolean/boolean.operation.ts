import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface BooleanParams {
  tools: [];
  keepTools:boolean;
  boolean: BooleanDefinition;
}

export const BooleanOperation: OperationDescriptor<BooleanParams> = {
  id: 'BOOLEAN',
  label: 'Boolean',
  icon: 'img/cad/intersection',
  info: 'Booleans 2D sketch',
  path:__dirname,
  paramsInfo: ({tools, boolean}) => `(${r(tools)} ${r(boolean)})`,
  run: (params: BooleanParams, ctx: ApplicationContext) => {
    throw 'BOOLEAN operation is not yet implemented with native engine';
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
      type: 'checkbox',
      name: 'keepTools',
      label: 'Keep Tools',
      defaultValue: false,
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
      icon: 'img/cad/union',
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'UNION'
        }
      }
    },
    {
      id: 'SUBTRACT',
      label: 'Subtract',
      icon: 'img/cad/subtract',
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'SUBTRACT'
        }
      }
    },
    {
      id: 'INTERSECT',
      label: 'Intersect',
      icon: 'img/cad/intersection',
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        boolean: {
          kind: 'INTERSECT'
        }
      }
    }
  ],
}
