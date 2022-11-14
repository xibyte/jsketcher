import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {SetLocation} from "cad/craft/e0/interact";
import {MDatum} from "cad/model/mdatum";
import { MShell } from 'cad/model/mshell';
import icon from "./MOVE-BODY.svg";

interface MoveBodyParams {
  datum: MDatum;
  body: MShell;
}

export const MoveBodyOperation: OperationDescriptor<MoveBodyParams> = {
  id: 'MOVE_BODY',
  label: 'Move Body',
  icon,
  info: 'Move Body',
  path:__dirname,
  paramsInfo: () => '',

  run: (params: MoveBodyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    console.log(params);
    const returnObject = {
      consumed: [params.body],
      created: []
    };
    const location = params.datum.csys.outTransformation._normalize();

    const newShellName = params.body.id+":T";

    oci.copy(params.body, newShellName);

    SetLocation(newShellName, location.toFlatArray());
    returnObject.created.push(occ.io.getShell(newShellName));

    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'datum',
      capture: [EntityKind.DATUM],
      label: 'Sketch',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'selection',
      name: 'body',
      capture: [EntityKind.SHELL],
      label: 'body',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 1
      },
    },

  ],
}
