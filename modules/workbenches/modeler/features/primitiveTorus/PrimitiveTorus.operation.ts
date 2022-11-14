import { ApplicationContext } from 'cad/context';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MDatum } from "cad/model/mdatum";
import CSys from "math/csys";
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import icon from "./TORUS.svg";

interface PrimitiveTorusParams {
  radius: number,
  tubeRadius: number,
  locations: MDatum,
  boolean: BooleanDefinition,
}

export const PrimitiveTorusOperation: OperationDescriptor<PrimitiveTorusParams> = {
  id: 'TORUS',
  label: 'Torus',
  icon,
  info: 'Primitive Torus',
  path:__dirname,
  paramsInfo: ({ radius, tubeRadius }) => `(${r(radius)} , ${r(tubeRadius)} )`,
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
      simplify: true,
    }

  ],


  run: (params: PrimitiveTorusParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
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

    oci.ptorus("torus", "csys", params.radius, params.tubeRadius);

    const torus = occ.io.getShell("torus", new ExpectedOrderProductionAnalyzer(
      [
        {
          id: 'F:TORUS',
          productionInfo: {
            role: 'sweep'
          }
        },
      ],
      [],
      []
    ));

    return occ.utils.applyBooleanModifier([torus], params.boolean);

  },
}


export default PrimitiveTorusOperation;