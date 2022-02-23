import {ApplicationContext} from 'context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface PrimitiveTorusParams {
  radius: number,
  tubeRadius: number,
  locations: {},
  boolean: BooleanDefinition,
}

export const PrimitiveTorusOperation: OperationDescriptor<PrimitiveTorusParams> = {
  id: 'PRIMITIVE_TORUS',
  label: 'Primitive Torus',
  icon: 'img/cad/torus',
  info: 'Primitive Torus',
  paramsInfo: ({radius, tubeRadius}) => `(${r(radius)} , ${r(tubeRadius)} )`,
  form: [
    {
      type: 'number',
      label: 'Radius',
      name: 'radius',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Tube Radius',
      name: 'tubeRadius',
      defaultValue: 10,
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


  run: (params: PrimitiveTorusParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    //pTorus cy 5 10
    oci.ptorus("torus", params.radius, params.tubeRadius);

    return occ.utils.applyBooleanModifier(["torus"], params.boolean);

  },
}
