import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {SetLocation} from "cad/craft/e0/interact";
import {MDatum} from "cad/model/mdatum";
import icon from "./HOLE.svg";
import { MFace } from 'cad/model/mface';
import {Matrix3x4} from "math/matrix";
import { applyRotation } from 'cad/craft/datum/rotate/rotateDatumOperation';
import CSysObject3D from 'cad/craft/datum/csysObject';
import { Circle } from 'cad/sketch/sketchModel';



interface HoleParams {
  datum: MDatum | MFace;
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
  icon,
  info: 'creates hole features',
  path:__dirname,
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
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const returnObject = {
      consumed: [],
      created: []
    };

    let sketch = ctx.sketchStorageService.readSketch(params.datum.id).loops;
    console.log(sketch, "sketch info here");

    oci.pcylinder("result", params.diameter / 2, params.depth);

    if (params.holeType == "counterbore") {
      oci.pcylinder("counterbore", params.counterBoreDiameter / 2, params.counterBoreDepth);

      oci.bop("result", "counterbore");
      oci.bopfuse("result");
    }

    if (params.holeType == "countersink") {

      const heightFromDiameterAndAngle = (params.countersinkDiameter - params.diameter) / (Math.tan((params.countersinkAngle / 180 * Math.PI) / 2));


      oci.pcone("countersink", params.countersinkDiameter / 2, 0, heightFromDiameterAndAngle);
      oci.bop("result", "countersink");
      oci.bopfuse("result");
    }


    sketch.forEach((holePoint,i) =>{
      if (holePoint instanceof Circle){
        const NewHoleName = "hole" + i
        oci.copy("result", NewHoleName);
        const tr = new Matrix3x4().setTranslation(holePoint.c.x, holePoint.c.y, holePoint.c.z);
        const location = params.datum.csys.outTransformation.combine(tr);
        SetLocation(NewHoleName, location.toFlatArray());
        returnObject.created.push(occ.io.getShell(NewHoleName));
      }
    })


    return returnObject;

  
  },
  form: [
    {
      type: 'selection',
      name: 'datum',
      capture: [EntityKind.DATUM, EntityKind.FACE],
      label: 'Sketch',
      multi: false,
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
