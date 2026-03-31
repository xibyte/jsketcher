import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MShell } from 'cad/model/mshell';
import { MDatum } from "cad/model/mdatum";
import {Matrix3x4} from "math/matrix";
import icon from "./LINEAR PATTERN.svg";

interface patternLinearParams {
  inputBodies: MShell[];
  patternMethod: string;
  face: MFace;
  distance: number;
  qty: number;
  direction: UnitVector,
}


export const PatternLinearOperation: OperationDescriptor<patternLinearParams> = {
  id: 'PATTERN_LINEAR',
  label: 'Linear pattern',
  icon: icon,
  info: 'Creates a linear pattern.',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run: (params: patternLinearParams, ctx: ApplicationContext) => {
    throw 'PATTERN_LINEAR operation is not yet implemented with native engine';
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
      defaultValue: "Step Distance",
      values: ['Step Distance', 'Span Distance',],
    },
    {
      type: 'number',
      label: 'Distance',
      name: 'distance',
      defaultValue: 50,
    },
    {
      type: 'number',
      label: 'Qty',
      name: 'qty',
      defaultValue: 3,
    },
    {
      type: 'direction',
      name: 'direction',
      label: 'direction',
      optional: true
    },
  ],
}