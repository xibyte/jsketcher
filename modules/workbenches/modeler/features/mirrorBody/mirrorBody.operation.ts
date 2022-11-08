import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MShell } from 'cad/model/mshell';
import icon from "./MIRROR.svg";

interface MirrorBodyParams {
  inputBodies: MShell[];
  face:MFace;
}

export const MirrorBodyOperation: OperationDescriptor<MirrorBodyParams> = {
  id: 'MIRROR_BODY',
  label: 'Mirror Body',
  icon,
  info: 'Mirrors selected body along plane of symytry.',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run: (params: MirrorBodyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const created =[];

    params.inputBodies.forEach((shellToMirror) => {
      const newShellName = shellToMirror.id + ":mirror";
      oci.copy(shellToMirror, newShellName);
      oci.tmirror(newShellName, ...params.face.csys.origin.data(), ...params.face.csys.z.normalize().data());
      created.push(occ.io.getShell(newShellName));
    });

    return {
      created,
      consumed: []
    };


  },
  form: [
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'Mirror Plane',
      multi: false,
      defaultValue: {
        usePreselection: false,
        preselectionIndex: 0
      },
    },
    {
      type: 'selection',
      name: 'inputBodies',
      capture: [EntityKind.SHELL],
      label: 'Bodies',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
