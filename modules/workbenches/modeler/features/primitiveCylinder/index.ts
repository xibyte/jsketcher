import {ApplicationContext} from 'context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface PrimitiveCylinderParams {
  diameter: number,
  height: number,
  locations: {},
  boolean: BooleanDefinition,
}

export const PrimitiveCylinderOperation: OperationDescriptor<PrimitiveCylinderParams> = {
  id: 'PRIMITIVE_CYLINDER',
  label: 'Primitive cylinder',
  icon: 'img/cad/cylinder',
  info: 'Primitive Cylinder',
  paramsInfo: ({height, diameter}) => `(${r(height)} , ${r(diameter)} )`,
  form: [
    {
      type: 'number',
      label: 'Diameter',
      name: 'diameter',
      defaultValue: 50,
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


  run: (params: PrimitiveCylinderParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    //pcylinder cy 5 10
    oci.pcylinder("cy", params.diameter / 2, params.height);

    return occ.utils.applyBooleanModifier(["cy"], params.boolean);

  },
}
