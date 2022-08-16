import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MDatum} from "cad/model/mdatum";
import CSys from "math/csys";
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";


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
  path:__dirname,
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

    oci.pcylinder("cylinder", "csys", params.diameter / 2, params.height);

    const cylinder = occ.io.getShell("cylinder", new ExpectedOrderProductionAnalyzer(
      [
        {
          id: 'F:SIDE',
          productionInfo: {
            role: 'sweep'
          }
        },
        {
          id: 'F:BASE',
          productionInfo: {
            role: 'base'
          }
        },
        {
          id: 'F:LID',
          productionInfo: {
            role: 'lid'
          }
        },

      ],
      [],
      []
    ));

    return occ.utils.applyBooleanModifier([cylinder], params.boolean);

  },
}
