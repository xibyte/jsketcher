import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MShell } from 'cad/model/mshell';
import {SameTopologyProductionAnalyzer, requireBrepShellForTopology} from "cad/craft/production/productionAnalyzer";

interface MirrorBodyParams {
  inputBodies: MShell[];
  face: MFace;
  featureId: number;
}

export const MirrorBodyOperation: OperationDescriptor<MirrorBodyParams> = {
  id: 'MIRROR_BODY',
  label: 'Mirror Body',
  icon: 'img/cad/MirrorBody.svg',
  info: 'Mirrors selected body along plane of symytry.',
  path: __dirname,
  paramsInfo: () => `(?)`,
  run: (params: MirrorBodyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const created = [];
    const origins = params.featureId === -1 ? null : params.inputBodies.map(requireBrepShellForTopology);

    params.inputBodies.forEach((shellToMirror, index) => {
      const origin = origins && origins[index];
      const newShellName = shellToMirror.id + ":mirror";
      oci.copy(shellToMirror, newShellName);
      oci.tmirror(newShellName, ...params.face.csys.origin.data(), ...params.face.csys.z.normalize().data());

      if (!origin) {
        created.push(occ.io.getShell(newShellName));
        return;
      }
      const resultingShell = occ.io.getShell(newShellName, new SameTopologyProductionAnalyzer(origin, params.featureId + "MIRROR"));
      resultingShell.id = shellToMirror.id + "[" + "M" + ":" + params.featureId + "]";
      created.push(resultingShell)
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
