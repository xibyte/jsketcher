import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import Axis from "math/axis";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { MShell } from 'cad/model/mshell';
import { MDatum } from "cad/model/mdatum";
import { Matrix3x4 } from "math/matrix";
import { AddLocation, SetLocation } from "cad/craft/e0/interact";
import icon from "./LINEAR-PATTERN.svg";
import { ExpectedOrderProductionAnalyzer, SameTopologyProductionAnalyzer } from "cad/craft/production/productionAnalyzer";


interface patternLinearParams {
  inputBodies: MShell[];
  patternMethod: string;
  distance: number;
  qty: number;
  direction: UnitVector,
  featureId: string;
}


export const PatternLinearOperation: OperationDescriptor<patternLinearParams> = {
  id: 'PATTERN_LINEAR',
  label: 'Linear pattern',
  icon,
  info: 'Creates a linear pattern.',
  path: __dirname,
  paramsInfo: () => `(?)`,
  run: (params: patternLinearParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const created = [];

    params.inputBodies.forEach((shellToPatern, index) => {
      for (let i = 2; i <= params.qty; i++) {
        let distanceForInstance = 0;
        if (params.patternMethod == 'Step Distance') distanceForInstance = params.distance * (i - 1);
        if (params.patternMethod == 'Span Distance') distanceForInstance = (params.distance / (params.qty - 1)) * (i - 1);

        const trVec = params.direction.multiply(distanceForInstance);

        const tr = new Matrix3x4().setTranslation(trVec.x, trVec.y, trVec.z);

        const newShellName = shellToPatern.id + ":patern/" + index + "/" + i;
        oci.copy(shellToPatern, newShellName);
        AddLocation(newShellName, tr.toFlatArray());


        const resultingShell = occ.io.getShell(newShellName, new SameTopologyProductionAnalyzer(shellToPatern, params.featureId + "P"));
        resultingShell.id = shellToPatern.id + "[" + "PL:" + params.featureId + "]" + "[" + "I:" + i + "]";
        created.push(resultingShell);
      }

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
      label: 'Bodies',
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
      label: 'Direction',
      optional: true
    },
  ],
}