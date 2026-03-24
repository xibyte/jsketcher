import {TbRotateClockwise} from 'react-icons/tb';
import {MShell} from 'cad/model/mshell';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface RotateBodySimpleParams {
  angle: number;
  axis: string;
  bodyCenter: boolean;
  shells: [MShell];
}

const AXES = {
  X: [1, 0, 0],
  Y: [0, 1, 0],
  Z: [0, 0, 1],
};

function shellCenter(shell: MShell): {x: number, y: number, z: number} {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of shell.brepShell.vertices) {
    const p = v.point;
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }
  return {x: (minX+maxX)/2, y: (minY+maxY)/2, z: (minZ+maxZ)/2};
}

export const RotateBodySimpleOperation: OperationDescriptor<RotateBodySimpleParams> = {
  id: 'ROTATE_BODY_SIMPLE',
  label: 'Rotate',
  icon: TbRotateClockwise,
  info: 'Rotate Body by angle around axis',
  path: __dirname,
  paramsInfo: ({ angle, axis }) => `(${r(angle)}° ${axis})`,
  run: (params: RotateBodySimpleParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;
    const [ax, ay, az] = AXES[params.axis] || AXES.Y;
    const returnObject = { consumed: params.shells, created: [] };
    params.shells.forEach((currentShell) => {
      const newShellId = currentShell.id + ":rotated";
      oci.copy(currentShell, newShellId);
      let px = 0, py = 0, pz = 0;
      if (params.bodyCenter) {
        const c = shellCenter(currentShell);
        px = c.x; py = c.y; pz = c.z;
      }
      oci.trotate(newShellId, px, py, pz, ax, ay, az, params.angle);
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
      name: 'angle',
      label: 'Angle (degrees)',
      defaultValue: 45,
    },
    {
      type: 'choice',
      name: 'axis',
      label: 'Axis',
      style: 'radio',
      values: ['X', 'Y', 'Z'],
      defaultValue: 'Y',
    },
    {
      type: 'checkbox',
      name: 'bodyCenter',
      label: 'Rotate around body center',
      defaultValue: true,
    },
  ],
}
