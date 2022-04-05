import {ApplicationContext} from 'context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {MDatum} from "cad/model/mdatum";
import CSys from "math/csys";


interface PrimitiveCylinderParams {
  diameter: number,
  height: number,
  locations: MDatum,
  boolean: BooleanDefinition,
}

export const PrimitiveCylinderOperation: OperationDescriptor<PrimitiveCylinderParams> = {
  id: 'CYLINDER',
  label: 'Cylinder',
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

    oci.pcylinder("cy", "csys", params.diameter / 2, params.height);

    return occ.utils.applyBooleanModifier(["cy"], params.boolean);

  },
}
