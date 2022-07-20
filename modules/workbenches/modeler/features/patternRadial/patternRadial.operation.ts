import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import Axis from "math/axis";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { MShell } from 'cad/model/mshell';
import {Matrix3x4} from "math/matrix";
import {SetLocation} from "cad/craft/e0/interact";

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


    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let created = [];

    params.inputBodies.forEach((shellToPatern, index) => {
      for (let i = 2; i <= params.qty; i++) {
        let angleForInstance = 0;
        if(params.patternMethod == 'Step Angle') angleForInstance =params.angle*(i-1);
        if(params.patternMethod == 'Span Angle') angleForInstance =(params.angle / (params.qty-1))*(i-1);

        //const tr = shellToPatern.location.rotate(degrees_to_radians(angleForInstance),params.direction.normalize(),params.direction.normalize());
        let tr = new Matrix3x4().rotate(degrees_to_radians(angleForInstance),params.direction.normalize(),params.direction.normalize());
        //tr = tr.rotateWithSphericalAxis(shellToPatern.location)
  
        const newShellName = shellToPatern.id + ":patern/" + index + "/" +i;
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
      defaultValue: "Step Angle",
      values: ['Step Angle', 'Span Angle',],
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


function degrees_to_radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}