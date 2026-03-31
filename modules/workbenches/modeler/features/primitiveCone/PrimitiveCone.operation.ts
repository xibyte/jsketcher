import { ApplicationContext } from 'cad/context';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MDatum } from "cad/model/mdatum";
import CSys from "math/csys";
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import icon from "./CONE.svg";


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
  icon: icon,
  info: 'Cone',
  path:__dirname,
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
    throw 'CONE operation is not yet implemented with native engine';
  },
}
