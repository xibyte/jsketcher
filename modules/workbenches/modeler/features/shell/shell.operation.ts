import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";


interface ShellParams {
  thickness: number;
  faces: [MFace];
}

export const ShellOperation: OperationDescriptor<ShellParams> = {
  id: 'SHELL_TOOL',
  label: 'Shell',
  icon: 'img/cad/shell',
  info: 'Shells 2D sketch',
  path:__dirname,
  paramsInfo: ({thickness}) => `(${r(thickness)})`,
  run: (params: ShellParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;


    const bodiesToShell = [];
    const returnObject = {
      consumed: [],
      created: []
    };

    //add all the edges and size to seperate arrays for each shell that edges are selected from

    params.faces.forEach((face) => {
      if (!returnObject.consumed.includes(face.shell)) {
        returnObject.consumed.push(face.shell);
        bodiesToShell[face.shell.id] = [];
      }
      bodiesToShell[face.shell.id].push(face);

    });

    //perform the opperations on each of the bodies.
    Object.keys(bodiesToShell).forEach((shellToOpperateOnName) => {
      const shellToOpperateOn = bodiesToShell[shellToOpperateOnName];
      const newShellName = shellToOpperateOnName + "f";

      const bodyToPerformShellOpperationOn = shellToOpperateOn[0].shell;
      oci.offsetcompshape(newShellName, bodyToPerformShellOpperationOn, -params.thickness, "1.e-3", ...shellToOpperateOn)
      returnObject.created.push(occ.io.getShell(newShellName));
    });

    return returnObject;
  },
  form: [
    {
      type: 'selection',
      name: 'faces',
      capture: [EntityKind.FACE],
      label: 'faces',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      name: 'thickness',
      label: 'thickness',
      defaultValue: 5,
    },
  ],
}
