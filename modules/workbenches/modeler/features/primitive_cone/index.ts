import { ApplicationContext } from 'context';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationPlugin";


interface PrimitiveConeParams {
  diameterA: number,
  diameterB: number,
  height: number,
  locations: {},
  boolean: BooleanDefinition,
}

const PrimitiveConeOperation: OperationDescriptor<PrimitiveConeParams> = {
  id: 'primitive_cone',
  label: 'Primitive Cone',
  icon: 'img/cad/cone',
  info: 'Primitive Cone',
  paramsInfo: ({ height, diameterA, diameterB }) => `(${r(height)} , ${r(diameterA)} , ${r(diameterB)} )`,
  form: [
    {
      type: 'number',
      label: 'Diameter A',
      name: 'diameterA',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Diameter B',
      name: 'diameterB',
      defaultValue: 25,
    },
    {
      type: 'number',
      label: 'Height',
      name: 'height',
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


  run: (params: PrimitiveConeParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    //pCone cy 5 10
    oci.pcone("cone", params.diameterA / 2, params.diameterB / 2, params.height);

    return occ.utils.applyBooleanModifier(["cone"], params.boolean);

  },
}

export default PrimitiveConeOperation;