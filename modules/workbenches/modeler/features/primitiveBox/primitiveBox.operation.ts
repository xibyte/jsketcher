import { ApplicationContext } from 'cad/context';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationBundle";
import CSys from "math/csys";
import { MDatum } from "cad/model/mdatum";
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import icon from "./CUBE.svg";

interface PrimitiveBoxParams {
  x: number,
  y: number,
  z: number,
  locations: MDatum,
  boolean: BooleanDefinition,
  featureId:string,
}

export const PrimitiveBoxOperation: OperationDescriptor<any> = {
  id: 'BOX',
  label: 'Box',
  icon,
  info: 'Primitive Box',
  path: __dirname,
  paramsInfo: ({ x, y, z }) => `(${r(x)} , ${r(y)} , ${r(z)})`,
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
      label: 'Location',
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
      label: 'Boolean',
      optional: true,
      simplify: true,
    }

  ],


  run: (params: PrimitiveBoxParams, ctx: ApplicationContext) => {
    console.log(params , this);
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const csys = params.locations?.csys || CSys.ORIGIN;

    oci.box("box",
      "-min", csys.origin.x, csys.origin.y, csys.origin.z,
      "-size", params.x, params.y, params.z,
      "-dir", csys.z.x, csys.z.y, csys.z.z,
      "-xdir", csys.x.x, csys.x.y, csys.x.z
    );

    const box = occ.io.getShell("box", new ExpectedOrderProductionAnalyzer(
      [
        {
          id: params.featureId + 'F:LEFT',
          productionInfo: {
            role: 'sweep'
          }
        },
        {
          id: params.featureId + 'F:RIGHT',
          productionInfo: {
            role: 'sweep'
          }
        },
        {
          id: params.featureId + 'F:BASE',
          productionInfo: {
            role: 'base'
          }
        },
        {
          id: params.featureId + 'F:LID',
          productionInfo: {
            role: 'lid'
          }
        },
        {
          id: params.featureId + 'F:BACK',
          productionInfo: {
            role: 'sweep'
          }
        },
        {
          id: params.featureId + 'F:FRONT',
          productionInfo: {
            role: 'sweep'
          }
        }
      ],
      [],
      []
    ));

    return occ.utils.applyBooleanModifier([box], params.boolean);
  },
}
