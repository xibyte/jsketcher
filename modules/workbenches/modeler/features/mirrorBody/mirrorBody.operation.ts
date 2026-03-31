import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MShell } from 'cad/model/mshell';

interface MirrorBodyParams {
  inputBodies: MShell[];
  face:MFace;
}

export const MirrorBodyOperation: OperationDescriptor<MirrorBodyParams> = {
  id: 'MIRROR_BODY',
  label: 'Mirror Body',
  icon: 'img/cad/MirrorBody',
  info: 'Mirrors selected body along plane of symytry.',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run: (params: MirrorBodyParams, ctx: ApplicationContext) => {
    throw 'MIRROR_BODY operation is not yet implemented with native engine';
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
