import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { MShell } from 'cad/model/mshell';
import { MDatum } from "cad/model/mdatum";
import {Matrix3x4} from "math/matrix";
import {SetLocation} from "cad/craft/e0/interact";

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
  icon: 'img/cad/patternLinear',
  info: 'Creates a linear pattern.',
  paramsInfo: ({ }) => `(?)`,
  run: (params: patternLinearParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let created = [];

    const newDatum = new MDatum({});
    console.log(newDatum);

    params.inputBodies.forEach((shellToPatern, index) => {

      shellToPatern.csys;

      const trVec = params.direction.multiply(params.distance);

      const tr = new Matrix3x4().setTranslation(trVec.x, trVec.y, trVec.z);

      const newShellName = shellToPatern.id + ":patern/" + index;
      oci.copy(shellToPatern, newShellName);
      SetLocation(newShellName, tr.toFlatArray());

      //oci.step();
      //oci.tmirror(newShellName, ...params.face.csys.origin.data(), ...params.face.csys.z.normalize().data());
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