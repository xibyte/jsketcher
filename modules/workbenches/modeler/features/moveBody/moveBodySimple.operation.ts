import {TbArrowsMaximize} from 'react-icons/tb';
import {MShell} from 'cad/model/mshell';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface MoveBodySimpleParams {
  x: number;
  y: number;
  z: number;
  shells: [MShell];
}

export const MoveBodySimpleOperation: OperationDescriptor<MoveBodySimpleParams> = {
  id: 'MOVE_BODY_SIMPLE',
  label: 'Move Body',
  icon: TbArrowsMaximize,
  info: 'Move Body by X Y Z',
  path: __dirname,
  paramsInfo: ({ x, y, z }) => `(${r(x)}, ${r(y)}, ${r(z)})`,
  run: (params: MoveBodySimpleParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;
    const returnObject = {
      consumed: params.shells,
      created: []
    };
    params.shells.forEach((currentShell) => {
      const newShellId = currentShell.id + ":moved";
      oci.copy(currentShell, newShellId);
      oci.ttranslate(newShellId, params.x, params.y, params.z);
      returnObject.created.push(occ.io.getShell(newShellId));
    });
    return returnObject;
  },
  form: [
    {
      type: 'selection',
      name: 'shells',
      capture: [EntityKind.SHELL],
      label: 'Body',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      name: 'x',
      label: 'X',
      defaultValue: 0,
    },
    {
      type: 'number',
      name: 'y',
      label: 'Y',
      defaultValue: 0,
    },
    {
      type: 'number',
      name: 'z',
      label: 'Z',
      defaultValue: 0,
    },
  ],
}
