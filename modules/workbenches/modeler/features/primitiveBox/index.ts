import {ApplicationContext} from 'context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface PrimitiveBoxParams {
  x: Number,
  y: Number,
  z: Number,
  locations: {},
  boolean: BooleanDefinition,
}

export const PrimitiveBoxOperation: OperationDescriptor<PrimitiveBoxParams> = {
  id: 'PRIMITIVE_BOX',
  label: 'Primitive Box',
  icon: 'img/cad/cube',
  info: 'Primitive Box',
  paramsInfo: ({x, y, z}) => `(${r(x)} , ${r(y)} , ${r(z)})`,
  form: [
    {
      type: 'number',
      label: 'X',
      name: 'x',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Y',
      name: 'y',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Z',
      name: 'z',
      defaultValue: 50,
    },
    {
      type: 'selection',
      name: 'locations',
      capture: [EntityKind.DATUM],
      label: 'locations',
      multi: false,
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],


  run: (params: PrimitiveBoxParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;


    oci.box("b", params.x, params.y, params.z);

    return occ.utils.applyBooleanModifier(["b"], params.boolean);

  },
}
