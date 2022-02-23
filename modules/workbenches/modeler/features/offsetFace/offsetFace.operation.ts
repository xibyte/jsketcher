import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface offsetParams {
  distance: number;
  faces: [MFace];
}

export const offsetOperation: OperationDescriptor<offsetParams> = {
  id: 'OFFSET_TOOL',
  label: 'offset',
  icon: 'img/cad/offset',
  info: 'offset faces',
  paramsInfo: ({distance}) => `(${r(distance)})`,
  run: (params: offsetParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;


    var bodiesTooffset = [];
    var returnObject = {
      consumed: [],
      created: []
    };

    //add all the edges and size to seperate arrays for each offset that edges are selected from

    params.faces.forEach((face) => {
      const newFaceId = face.id + ":offset";

      oci.offset(newFaceId,face,params.distance);
      returnObject.created.push(occ.io.getShell(newFaceId));
    });


    console.log(returnObject);

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
      name: 'distance',
      label: 'distance',
      defaultValue: 5,
    },
  ],
}
