import {TbArrowsMaximize} from 'react-icons/tb';
import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {OperationDescriptor} from 'cad/craft/operationBundle';
import {requireBrepShellForTopology, SameTopologyProductionAnalyzer} from 'cad/craft/production/productionAnalyzer';
import {EntityKind} from 'cad/model/entities';
import {MShell} from 'cad/model/mshell';

interface ScaleBodyPivotParams {
  shells: MShell[];
  x: number;
  y: number;
  z: number;
  factor: number;
  featureId: number;
}

/** Uniformly scale OCC bodies relative to a world-space pivot. */
export const ScaleBodyPivotOperation: OperationDescriptor<ScaleBodyPivotParams> = {
  id: 'SCALE_BODY_PIVOT',
  label: 'Scale around pivot (OCC)',
  icon: TbArrowsMaximize,
  info: 'Scale OCC bodies uniformly around a global pivot.',
  path: __dirname,
  paramsInfo: ({factor}) => `(×${r(factor)})`,
  run: (params: ScaleBodyPivotParams, ctx: ApplicationContext) => {
    if (!Array.isArray(params.shells) || !params.shells.length ||
        ![params.x, params.y, params.z, params.factor].every(Number.isFinite) || params.factor <= 0) {
      throw new Error('Choose at least one body, enter a finite pivot and a positive scale factor.');
    }
    if (!Number.isSafeInteger(params.featureId) || params.featureId < 1) {
      throw new Error('Could not identify the scale operation.');
    }
    const originals = params.shells.map(requireBrepShellForTopology);
    if (originals.some(body => body.topology?.data?.__meshWithOrigins)) {
      throw new Error('This is a Native Mesh solid. OCC and native solids cannot be mixed or converted yet.');
    }
    const {commandInterface: oci, io} = ctx.occService;
    const created = originals.map((body, index) => {
      const name = `ScalePivot:${params.featureId}:${index}`;
      if (oci.copy(body, name) !== 0 || oci.tscale(name, params.x, params.y, params.z, params.factor) !== 0) {
        throw new Error('Could not scale the selected body.');
      }
      const result = io.getShell(name, new SameTopologyProductionAnalyzer(body, `${params.featureId}SCALE:${index}`));
      result.id = `${body.id}[SCALE:${params.featureId}:${index}]`;
      return result;
    });
    return {created, consumed: params.shells};
  },
  form: [
    {type: 'selection', name: 'shells', capture: [EntityKind.SHELL], label: 'OCC bodies', multi: true, occShellChoices: true,
      defaultValue: {usePreselection: true, preselectionIndex: 0}},
    {type: 'number', name: 'x', label: 'Pivot X', defaultValue: 0},
    {type: 'number', name: 'y', label: 'Pivot Y', defaultValue: 0},
    {type: 'number', name: 'z', label: 'Pivot Z', defaultValue: 0},
    {type: 'number', name: 'factor', label: 'Scale factor', defaultValue: 2},
  ],
};
