import { OCCService } from 'cad/craft/e0/occService';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { MShell } from "cad/model/mshell";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { MObject } from "cad/model/mobject";


interface getVolumeParams {
  targetBody: MShell;
}

export const GetVolume: OperationDescriptor<getVolumeParams> = {
  id: 'GET_VOLUME',
  label: 'VOLUME',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  run: (params: getVolumeParams, ctx: ApplicationContext) => {

    let occ = ctx.services.OCCService;
    const oci = occ.commandInterface;

    alert();

    return;
  },



  form: [
    {
      type: 'selection',
      name: 'targetBody',
      capture: [EntityKind.SHELL],
      label: 'Body',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
