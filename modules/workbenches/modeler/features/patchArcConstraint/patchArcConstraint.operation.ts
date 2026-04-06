import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {EntityKind} from "cad/model/entities";
import {MPatchCage} from "cad/model/mpatchcage";
import {BiCircle} from "react-icons/bi";

interface PatchArcConstraintParams {
  target: any;
  side: number;
  radius: number;
  angle: number;
  mode: string;
}

export const PatchArcConstraintOperation: OperationDescriptor<PatchArcConstraintParams> = {
  id: 'PATCH_ARC_CONSTRAINT',
  label: 'Arc Constraint',
  icon: BiCircle,
  info: 'Constrain a patch edge to a circular arc',
  path: __dirname,
  paramsInfo: ({radius, angle, mode}) => `(r:${radius} a:${angle}° ${mode})`,

  run: (params: PatchArcConstraintParams, ctx: ApplicationContext) => {
    const target = params.target;
    if (!target || !(target instanceof MPatchCage)) {
      throw new Error('Select a patch cage object first');
    }

    const cage = target.cage;
    const patchIdx = 0; // TODO: use selected patch index from view state
    const side = params.side;
    const radius = params.radius;
    const angle = params.angle;
    const mode = params.mode === 'rational' ? 'rational' : 'approximate';

    // Compute plane normal from surface at edge midpoint
    const patch = cage.patches[patchIdx];
    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    const planeNormal = patch.normal(u, v);

    cage.constrainEdgeToArc(patchIdx, side, radius, angle, planeNormal, mode as any);
    target.recompute();

    return {
      consumed: [],
      created: [],
    };
  },

  form: [
    {
      type: 'selection',
      name: 'target',
      capture: [EntityKind.PATCH_CAGE],
      label: 'Patch Cage',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      style: 'dropdown',
      name: 'side',
      label: 'Edge Side',
      values: ['0 - Bottom', '1 - Right', '2 - Top', '3 - Left'],
      defaultValue: '0 - Bottom',
    },
    {
      type: 'number',
      name: 'radius',
      label: 'Radius',
      defaultValue: 50,
    },
    {
      type: 'number',
      name: 'angle',
      label: 'Angle (degrees)',
      defaultValue: 90,
      min: 1,
      max: 180,
    },
    {
      type: 'choice',
      style: 'dropdown',
      name: 'mode',
      label: 'Mode',
      values: ['approximate', 'rational'],
      defaultValue: 'approximate',
    },
  ],
};
