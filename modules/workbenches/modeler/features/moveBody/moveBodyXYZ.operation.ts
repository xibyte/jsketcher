// Adapted from Pesicp's direct-translation tool in upstream PR #218.
import {TbArrowsMaximize} from 'react-icons/tb';
import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {OperationDescriptor} from 'cad/craft/operationBundle';
import {requireBrepShellForTopology, SameTopologyProductionAnalyzer} from 'cad/craft/production/productionAnalyzer';
import {EntityKind} from 'cad/model/entities';
import {MShell} from 'cad/model/mshell';

interface MoveBodyXYZParams {
  shells: MShell[];
  x: number;
  y: number;
  z: number;
  featureId: number;
}

export const MoveBodyXYZOperation: OperationDescriptor<MoveBodyXYZParams> = {
  id: 'MOVE_BODY_XYZ',
  label: 'Move by XYZ',
  icon: TbArrowsMaximize,
  info: 'Move selected bodies by a distance on each axis.',
  path: __dirname,
  paramsInfo: ({x, y, z}) => `(${r(x)}, ${r(y)}, ${r(z)})`,
  run: (params: MoveBodyXYZParams, ctx: ApplicationContext) => {
    if (!Array.isArray(params.shells) || !params.shells.length || ![params.x, params.y, params.z].every(Number.isFinite)) {
      throw new Error('Choose at least one body and enter finite distances.');
    }
    if (!Number.isSafeInteger(params.featureId) || params.featureId < 1) {
      throw new Error('Could not identify the move operation.');
    }
    const originals = params.shells.map(requireBrepShellForTopology);
    const {commandInterface: oci, io} = ctx.occService;
    const created = originals.map((body, index) => {
      const temporaryName = `MoveXYZ:${params.featureId}:${index}`;
      if (oci.copy(body, temporaryName) !== 0 ||
          oci.ttranslate(temporaryName, params.x, params.y, params.z) !== 0) {
        throw new Error('Could not move the selected body.');
      }
      const result = io.getShell(temporaryName, new SameTopologyProductionAnalyzer(body, `${params.featureId}MOVE:${index}`));
      result.id = `${body.id}[MOVE:${params.featureId}:${index}]`;
      return result;
    });
    return {created, consumed: params.shells};
  },
  form: [
    {type: 'selection', name: 'shells', capture: [EntityKind.SHELL], label: 'Bodies', multi: true,
      defaultValue: {usePreselection: true, preselectionIndex: 0}},
    {type: 'number', name: 'x', label: 'X distance', defaultValue: 0},
    {type: 'number', name: 'y', label: 'Y distance', defaultValue: 0},
    {type: 'number', name: 'z', label: 'Z distance', defaultValue: 0},
  ],
};
