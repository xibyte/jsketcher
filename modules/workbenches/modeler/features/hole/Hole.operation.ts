import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface HoleParams {
  diameter: number;
  depth: number;
  counterBoreDiameter: number;
  counterBoreDepth: number;
  countersinkDiameter: number;
  countersinkAngle: number;
  holeType: string;
}

export const HoleOperation: OperationDescriptor<HoleParams> = {
  id: 'HOLE_TOOL',
  label: 'hole',
  icon: 'img/cad/Shell',
  info: 'creates hole features',
  paramsInfo: ({
                 diameter,
                 depth,
                 counterBoreDiameter,
                 counterBoreDepth,
                 countersinkDiameter,
                 countersinkAngle,
                 holeType,
               }) => `(${r(depth)} ${r(counterBoreDiameter)})  ${r(counterBoreDepth)})`,

  run: (params: HoleParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    var returnObject = {
      consumed: [],
      created: []
    };

    oci.pcylinder("basehole", params.diameter / 2, params.depth);

    if (params.holeType == "normal") {
      returnObject.created.push(occ.io.getShell("basehole"));
    }

    if (params.holeType == "counterbore") {
      oci.pcylinder("counterbore", params.counterBoreDiameter / 2, params.counterBoreDepth);

      oci.bop("basehole", "counterbore");
      oci.bopfuse("result");

      returnObject.created.push(occ.io.getShell("result"));
    }

    if (params.holeType == "countersink") {

      let heightFromDiameterAndAngle = (params.countersinkDiameter - params.diameter) / (Math.tan((params.countersinkAngle / 180 * Math.PI) / 2));


      oci.pcone("countersink", params.countersinkDiameter / 2, 0, heightFromDiameterAndAngle);
      oci.bop("basehole", "countersink");
      oci.bopfuse("result");
      returnObject.created.push(occ.io.getShell("result"));
    }


    console.log(returnObject);

    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'sketch',
      capture: [EntityKind.FACE],
      label: 'faces',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'choice',
      label: 'HoleType',
      name: "holeType",
      style: "dropdown",
      defaultValue: "counterbore",
      values: ['counterbore', 'countersink', 'normal',],
    },


    {
      type: 'number',
      name: "diameter",
      defaultValue: 10,
      label: 'Hole ⌀'
    },
    {
      type: 'number',
      name: "depth",
      defaultValue: 100,
      label: 'Hole ↧'
    },


    {
      type: 'number',
      name: "counterBoreDiameter",
      defaultValue: 20,
      label: '⌴ ⌀'
    },
    {
      type: 'number',
      name: "counterBoreDepth",
      defaultValue: 10,
      label: '⌴ ↧'
    },


    {
      type: 'number',
      name: "countersinkDiameter",
      defaultValue: 20,
      label: '⌵ ⌀'
    },
    {
      type: 'number',
      name: "countersinkAngle",
      defaultValue: 90,
      label: '⌵ Angle'
    },
  ],
}
