import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { SetLocation } from "cad/craft/e0/interact";
import { MDatum } from "cad/model/mdatum";
import { MShell } from 'cad/model/mshell';
import icon from "./MOVE-BODY.svg";

interface MoveBodyParams {
  toLocation: MDatum;
  fromLocation: MDatum;
  body: MShell;
}

export const MoveBodyOperation: OperationDescriptor<MoveBodyParams> = {
  id: 'MOVE_BODY',
  label: 'Move Body',
  icon,
  info: 'Move Body',
  path: __dirname,
  paramsInfo: () => '',

  run: (params: MoveBodyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    console.log(params);
    const returnObject = {
      consumed: [params.body],
      created: []
    };

    const bodyLocation = params.body.csys;
    const fromLocation = params.fromLocation.csys;
    const toLocation = params.toLocation.csys;

    let location = bodyLocation.outTransformation._normalize();


    // location = location.combine(
    //   fromLocation.outTransformation.combine(toLocation.inTransformation._normalize())
    // )._normalize();

    location = location.combine(toLocation.outTransformation._normalize().combine(fromLocation.outTransformation._normalize()));
    //location = location.combine(bodyLocation.inTransformation);

    //let  location =fromLocation.outTransformation.combine(toLocation.outTransformation);
    //location = location.combine(toLocation.outTransformation._normalize())._normalize();

    //const location = params.toLocation.csys.outTransformation._normalize();

    //const Newlocation = toLocation.outTransformation.combine(fromLocation.inTransformation._normalize())._normalize();
    //const Newlocation = fromLocation.inTransformation.combine(toLocation.outTransformation);
    //const Newlocation = toLocation.outTransformation.combine(fromLocation.outTransformation)._normalize();

    //let location = params.body.csys.outTransformation.combine(fromLocation.outTransformation._normalize())._normalize();
    //location = location.combine(Newlocation)._normalize();

    //location =Newlocation;


    const newShellName = params.body.id + ":T";

    oci.copy(params.body, newShellName);


    SetLocation(newShellName, location.toFlatArray());
    returnObject.created.push(occ.io.getShell(newShellName));

    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'toLocation',
      capture: [EntityKind.DATUM],
      label: 'To Location',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },


    {
      type: 'selection',
      name: 'fromLocation',
      capture: [EntityKind.DATUM],
      label: 'From Location',
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
