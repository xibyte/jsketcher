import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MDatum} from "cad/model/mdatum";
import { MShell } from 'cad/model/mshell';

interface MoveBodyParams {
  datum: MDatum;
  body: MShell;
}

export const MoveBodyOperation: OperationDescriptor<MoveBodyParams> = {
  id: 'MOVE_BODY',
  label: 'Move Body',
  icon: 'img/cad/moveBody',
  info: 'Move Body',
  path:__dirname,
  paramsInfo: () => '',

  run: (params: MoveBodyParams, ctx: ApplicationContext) => {
    throw 'MOVE_BODY operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'datum',
      capture: [EntityKind.DATUM],
      label: 'Sketch',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'selection',
      name: 'body',
      capture: [EntityKind.SHELL],
      label: 'body',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 1
      },
    },

  ],
}
