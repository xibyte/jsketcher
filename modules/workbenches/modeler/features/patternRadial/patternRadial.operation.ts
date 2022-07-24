import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import Axis from "math/axis";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {MShell} from 'cad/model/mshell';
import {Matrix3x4} from "math/matrix";
import {SetLocation} from "cad/craft/e0/interact";
import {DEG_RAD} from "math/commons";

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
  icon: 'img/cad/patternRadial',
  info: 'Creates a Radial pattern.',
  paramsInfo: p => `( ${p.patternMethod} ${r(p.angle * DEG_RAD)})`,
  run: (params: patternRadialParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let created = [];

    params.inputBodies.forEach((shellToPatern, index) => {
      for (let i = 2; i <= params.qty; i++) {
        let angleForInstance;
        if (params.patternMethod == 'step angle') {
          angleForInstance = params.angle*(i-1);
        } else if (params.patternMethod == 'span angle') {
          angleForInstance = (params.angle / (params.qty))*(i-1);
        } else {
          throw 'unsupported pattern type: ' + params.patternMethod;
        }

        const angle = angleForInstance * DEG_RAD;

        let tr = new Matrix3x4().rotate(angle, params.axis.direction, params.axis.origin);

        const newShellName = shellToPatern.id + ":pattern/" + index + "/" +i;
        oci.copy(shellToPatern, newShellName);
        SetLocation(newShellName, tr.toFlatArray());
  
        created.push(occ.io.getShell(newShellName));    
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
      defaultValue: "step angle",
      values: ['step angle','span angle',],
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