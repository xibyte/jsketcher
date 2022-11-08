import {MShell} from 'cad/model/mshell';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import icon from "./SCALE.svg";

interface scaleParams {
  distance: number;
  shells: [MShell];
}

export const ScaleOperation: OperationDescriptor<scaleParams> = {
  id: 'SCALE_BODY',
  label: 'Scale',
  icon,
  info: 'Scale Body',
  path:__dirname,
  paramsInfo: ({ distance }) => `(${r(distance)})`,
  run: (params: scaleParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const returnObject = {
      consumed: params.shells,
      created: []
    };

    params.shells.forEach((currentShell) => {
      const newShellId = currentShell.id + ":scaled";
      oci.copy(currentShell, newShellId);
      oci.tscale(newShellId, currentShell.csys.x, currentShell.csys.y, currentShell.csys.z, params.distance);
      returnObject.created.push(occ.io.getShell(newShellId));
    });

    return returnObject;

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
