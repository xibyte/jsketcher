import { CSys } from 'math/csys';
import { MShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationPlugin";


interface scaleParams {
  distance: number;
  shells: [MShell];
}

export const ScaleOperation: OperationDescriptor<scaleParams> = {
  id: 'SCALE_BODY',
  label: 'Scale',
  icon: 'img/cad/scale',
  info: 'Scale Body',
  paramsInfo: ({ distance }) => `(${r(distance)})`,
  run: (params: scaleParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    var returnObject = {
      consumed: params.shells,
      created: []
    };


    params.shells.forEach((currentShell) => {
      const newShellId = currentShell.id + ":scaled";
      oci.copy(currentShell, newShellId);
      oci.tscale(newShellId, currentShell.csys.x, currentShell.csys.y, currentShell.csys.z, params.distance);
      returnObject.created.push(occ.io.getShell(newShellId));
    });


    console.log(returnObject);

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
