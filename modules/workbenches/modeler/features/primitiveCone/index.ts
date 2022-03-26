import { ApplicationContext } from 'context';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import {MDatum} from "cad/model/mdatum";
import CSys from "math/csys";


interface PrimitiveConeParams {
  diameterA: number,
  diameterB: number,
  height: number,
  locations: MDatum,
  boolean: BooleanDefinition,
}

export const PrimitiveConeOperation: OperationDescriptor<PrimitiveConeParams> = {
  id: 'CONE',
  label: 'Cone',
  icon: 'img/cad/cone',
  info: 'Cone',
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

    const csys = params.locations?.csys || CSys.ORIGIN;
    oci.plane("csys",
      csys.origin.x,
      csys.origin.y,
      csys.origin.z,
      csys.x.x,
      csys.x.y,
      csys.x.z,
      csys.y.x,
      csys.y.y,
      csys.y.z);

    oci.pcone("cone", "csys", params.diameterA / 2, params.diameterB / 2, params.height);

    return occ.utils.applyBooleanModifier(["cone"], params.boolean);

  },
}
