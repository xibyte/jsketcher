import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import icon from "./WireLine.svg";
import { MDatum } from 'cad/model/mdatum';


interface WireLineParams {
  points: MDatum[];
}

export const WireLineOperation: OperationDescriptor<WireLineParams> = {
  id: 'WIRE_LINE',
  label: 'Line',
  icon: icon,
  info: 'Create Wire Line',
  path: __dirname,
  paramsInfo: ({ points }) => `(${r(points)})`,
  run: (params: WireLineParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;
    console.log(params);
    oci.line("newLine",
     params.points[0].csys.origin.x,
     params.points[0].csys.origin.y,     
     params.points[0].csys.origin.z,  
     
     params.points[1].csys.origin.x,
     params.points[1].csys.origin.y,     
     params.points[1].csys.origin.z,   
     );

     console.log(     
      params.points[0].csys.origin.x,
      params.points[0].csys.origin.y,     
      params.points[0].csys.origin.z,  
      
      params.points[1].csys.origin.x,
      params.points[1].csys.origin.y,     
      params.points[1].csys.origin.z,  );

     oci.wire("newLineEdge", "newLine");
     oci.mkface("newLineFace","newLineEdge");
     oci.prism("newLinePrism", "newLineFace", 0 , 0, 1)

    const created = [occ.io.getShell("newLineFace")];
    const consumed = [];

    console.log(params.points);

    const returnObject = {
      created,
      consumed
    }
    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'points',
      capture: [EntityKind.DATUM],
      label: 'points',
      optional: false,
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
