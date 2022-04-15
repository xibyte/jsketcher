import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { MShell } from 'cad/model/mshell';

interface patternLinearParams {
  inputBodies: MShell[];
  patternMethod: string;
  face: MFace;
  distance: number;
  qty: number;
  direction?: UnitVector,
}


export const PatternLinearOperation: OperationDescriptor<patternLinearParams> = {
  id: 'PATTERN_LINEAR',
  label: 'Linear pattern',
  icon: 'img/cad/patternLinear',
  info: 'Creates a linear pattern.',
  paramsInfo: ({ }) => `(${r()})`,
  run: (params: patternLinearParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let created = [];

    params.inputBodies.forEach((shellToMirror) => {
      const newShellName = shellToMirror.id + ":mirror";
      oci.copy(shellToMirror, newShellName);
      oci.tmirror(newShellName, ...params.face.csys.origin.data(), ...params.face.csys.z.normalize().data());
      created.push(occ.io.getShell(newShellName));
    });

    return {
      created,
      consumed: []
    };


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
      defaultValue: "Step Angle",
      values: ['Step Angle', 'Span Angle',],
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