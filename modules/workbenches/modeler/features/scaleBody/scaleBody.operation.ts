import {MShell} from 'cad/model/mshell';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";


interface scaleParams {
  distance: number;
  shells: [MShell];
}

export const ScaleOperation: OperationDescriptor<scaleParams> = {
  id: 'SCALE_BODY',
  label: 'Scale',
  icon: 'img/cad/scale',
  info: 'Scale Body',
  path:__dirname,
  paramsInfo: ({ distance }) => `(${r(distance)})`,
  run: (params: scaleParams, ctx: ApplicationContext) => {
    throw 'SCALE_BODY operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'shells',
      capture: [EntityKind.SHELL],
      label: 'shells',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      name: 'distance',
      label: 'distance',
      defaultValue: 5,
    },
  ],
}
