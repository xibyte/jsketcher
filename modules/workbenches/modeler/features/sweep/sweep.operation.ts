import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSketchLoop} from "cad/model/mloop";

interface SweepParams {
  profile: MSketchLoop;
  sweepPath: MSketchLoop;
  cornerStyle: string;
  boolean: BooleanDefinition;
}

export const SweepOperation: OperationDescriptor<SweepParams> = {
  id: 'SWEEP',
  label: 'Sweep',
  icon: 'img/cad/sweep',
  info: 'Sweeps 2D profile loop',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run: (params: SweepParams, ctx: ApplicationContext) => {
    throw 'SWEEP operation is not yet implemented with native engine';
  },

  form: [
    {
      type: 'selection',
      name: 'profile',
      capture: [EntityKind.LOOP],
      label: 'profile',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'selection',
      name: 'sweepPath',
      capture: [EntityKind.LOOP],
      label: 'Path',
      multi: false,
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      style: "dropdown",
      label: 'Corner Style',
      name: 'cornerStyle',
      values: ["Round", "Sharp"],
      defaultValue: "Round",
    },

    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}
