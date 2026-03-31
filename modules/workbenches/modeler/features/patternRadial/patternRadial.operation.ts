import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import Axis from "math/axis";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MShell} from 'cad/model/mshell';
import {Matrix3x4} from "math/matrix";
import {DEG_RAD} from "math/commons";
import icon from "./RADIAL PATTERN.svg";

interface patternRadialParams {
  inputBodies: MShell[];
  patternMethod: string;
  face: MFace;
  angle: number;
  qty: number;
  axis: Axis,
}


export const PatternRadialOperation: OperationDescriptor<patternRadialParams> = {
  id: 'PATTERN_RADIAL',
  label: 'Radial pattern',
  icon: icon,
  info: 'Creates a Radial pattern.',
  path:__dirname,
  paramsInfo: p => `( ${p.patternMethod} ${r(p.angle * DEG_RAD)})`,
  run: (params: patternRadialParams, ctx: ApplicationContext) => {
    throw 'PATTERN_RADIAL operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'inputBodies',
      capture: [EntityKind.SHELL],
      label: 'body',
      multi: true,
      defaultValue: {
        usePreselection: false,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      label: 'Pattern Method',
      name: "patternMethod",
      style: "dropdown",
      defaultValue: "step",
      values: [['step', 'Step Angle'], ['span', 'Span Angle']],
    },
    {
      type: 'number',
      label: 'Angle',
      name: 'angle',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Qty',
      name: 'qty',
      defaultValue: 3,
    },
    {
      type: 'axis',
      name: 'axis',
      label: 'axis',
      optional: false
    },
  ],
}