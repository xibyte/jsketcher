import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MDatum} from "cad/model/mdatum";
import CSys from "math/csys";
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import icon from "./SPHERE.svg";

interface PrimitiveSphereParams {
  radius: number,
  locations: MDatum,
  boolean: BooleanDefinition,
}

export const PrimitiveSphereOperation: OperationDescriptor<PrimitiveSphereParams> = {
  id: 'SPHERE',
  label: 'Sphere',
  icon,
  info: 'Primitive Sphere',
  path:__dirname,
  paramsInfo: ({radius,}) => `(${r(radius)}  )`,
  form: [
    {
      type: 'number',
      label: 'Radius',
      name: 'radius',
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
      simplify: true,
    }

  ],


  run: (params: PrimitiveSphereParams, ctx: ApplicationContext) => {

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

    oci.psphere("sphere", "csys", params.radius);

    const sphere = occ.io.getShell("sphere", new ExpectedOrderProductionAnalyzer(
      [
        {
          id: 'F:SPHERE',
          productionInfo: {
            role: 'sweep'
          }
        },
      ],
      [],
      []
    ));

    return occ.utils.applyBooleanModifier([sphere], params.boolean);

  },
}
