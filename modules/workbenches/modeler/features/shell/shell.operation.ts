import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";


interface ShellParams {
  thickness: number;
  faces: [MFace];
}

export const ShellOperation: OperationDescriptor<ShellParams> = {
  id: 'SHELL_TOOL',
  label: 'Shell',
  icon: 'img/cad/shell',
  info: 'Shells 2D sketch',
  path:__dirname,
  paramsInfo: ({thickness}) => `(${r(thickness)})`,
  run: (params: ShellParams, ctx: ApplicationContext) => {
    throw 'SHELL operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'faces',
      capture: [EntityKind.FACE],
      label: 'faces',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      name: 'thickness',
      label: 'thickness',
      defaultValue: 5,
    },
  ],
}
