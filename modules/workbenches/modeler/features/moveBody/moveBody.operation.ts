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
  featureId;
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

    console.log("from location", params.fromLocation)

    const toLocation = params.toLocation.csys;
    const bodyLocation = params.body.csys;
    let location = bodyLocation.outTransformation; //._normalize();


    if (params.fromLocation) {
      //Set position of object using a fromLocation and toLocation
      const fromLocation = params.fromLocation.csys;

      location = location.combine(
        toLocation.outTransformation._normalize().combine(fromLocation.inTransformation._normalize())
      );

    } else {
      //just set a new posistion on the body.
      location = location.combine(toLocation.outTransformation);
    }

    const newShellName = params.body.id + ":T"+ params.featureId;

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
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 1
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
