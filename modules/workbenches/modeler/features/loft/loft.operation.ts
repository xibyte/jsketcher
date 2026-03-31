import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MSketchLoop } from "cad/model/mloop";


interface LoftParams {
  loops: MSketchLoop[];
  boolean: BooleanDefinition;
  loftType: string;
}

export const LoftOperation: OperationDescriptor<LoftParams> = {
  id: 'LOFT',
  label: 'Loft',
  icon: 'img/cad/loft',
  info: 'Lofts 2D sketch',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run:async (params: LoftParams, ctx: ApplicationContext) => {
    throw 'LOFT operation is not yet implemented with native engine';
  },


  form: [
    {
      type: 'selection',
      name: 'loops',
      capture: [EntityKind.LOOP],
      label: 'Loops',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      label: 'Loft Type',
      name: "loftType",
      style: "dropdown",
      defaultValue: "smooth",
      values: ['smooth', 'sharp',],
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}