import {TbRotateClockwise} from 'react-icons/tb';
import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {OperationDescriptor} from 'cad/craft/operationBundle';
import {requireBrepShellForTopology, SameTopologyProductionAnalyzer} from 'cad/craft/production/productionAnalyzer';
import {EntityKind} from 'cad/model/entities';
import {MShell} from 'cad/model/mshell';

interface RotateBodyAxisParams {
  shells: MShell[];
  axis: 'X' | 'Y' | 'Z';
  x: number;
  y: number;
  z: number;
  degrees: number;
  featureId: number;
}

/** Rotate OCC bodies around a world-axis line through the specified pivot. */
export const RotateBodyAxisOperation: OperationDescriptor<RotateBodyAxisParams> = {
  id: 'ROTATE_BODY_AXIS',
  label: 'Rotate around axis (OCC)',
  icon: TbRotateClockwise,
  info: 'Rotate OCC bodies around a global X, Y or Z axis through a pivot.',
  path: __dirname,
  paramsInfo: ({axis, degrees}) => `(${axis}, ${r(degrees)}°)`,
  run: (params: RotateBodyAxisParams, ctx: ApplicationContext) => {
    const axes = {X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1]};
    if (!Array.isArray(params.shells) || !params.shells.length ||
        !Object.prototype.hasOwnProperty.call(axes, params.axis) || ![params.x, params.y, params.z, params.degrees].every(Number.isFinite)) {
      throw new Error('Choose at least one body and an axis, and enter a finite pivot and angle.');
    }
    if (!Number.isSafeInteger(params.featureId) || params.featureId < 1) {
      throw new Error('Could not identify the rotate operation.');
    }
    const originals = params.shells.map(requireBrepShellForTopology);
    if (originals.some(body => body.topology?.data?.__meshWithOrigins)) {
      throw new Error('This is a Native Mesh solid. OCC and native solids cannot be mixed or converted yet.');
    }
    const {commandInterface: oci, io} = ctx.occService;
    const [dx, dy, dz] = axes[params.axis];
    const created = originals.map((body, index) => {
      const name = `RotateAxis:${params.featureId}:${index}`;
      if (oci.copy(body, name) !== 0 ||
          oci.trotate(name, params.x, params.y, params.z, dx, dy, dz, params.degrees) !== 0) {
        throw new Error('Could not rotate the selected body.');
      }
      const result = io.getShell(name, new SameTopologyProductionAnalyzer(body, `${params.featureId}ROTATE:${index}`));
      result.id = `${body.id}[ROTATE:${params.featureId}:${index}]`;
      return result;
    });
    return {created, consumed: params.shells};
  },
  form: [
    {type: 'selection', name: 'shells', capture: [EntityKind.SHELL], label: 'OCC bodies', multi: true,
      defaultValue: {usePreselection: true, preselectionIndex: 0}},
    {type: 'choice', name: 'axis', label: 'Global axis', style: 'dropdown', defaultValue: 'Z', values: ['X', 'Y', 'Z']},
    {type: 'number', name: 'x', label: 'Pivot X', defaultValue: 0},
    {type: 'number', name: 'y', label: 'Pivot Y', defaultValue: 0},
    {type: 'number', name: 'z', label: 'Pivot Z', defaultValue: 0},
    {type: 'number', name: 'degrees', label: 'Angle (degrees)', defaultValue: 90},
  ],
};
