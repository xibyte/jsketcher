import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import { SetLocation } from "cad/craft/e0/interact";
import { MDatum } from "cad/model/mdatum";
import icon from "./HOLE.svg";
import { MFace } from 'cad/model/mface';
import { Matrix3x4 } from "math/matrix";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { applyRotation } from 'cad/craft/datum/rotate/rotateDatumOperation';
import CSysObject3D from 'cad/craft/datum/csysObject';
import { Circle } from 'cad/sketch/sketchModel';
import { ExpectedOrderProductionAnalyzer } from "cad/craft/production/productionAnalyzer";



interface HoleParams {
  sketch: MDatum | MFace;
  diameter: number;
  depth: number;
  counterBoreDiameter: number;
  counterBoreDepth: number;
  countersinkDiameter: number;
  countersinkAngle: number;
  holeType: string;
  boolean: BooleanDefinition;
  invertDirection: boolean;
}

export const HoleOperation: OperationDescriptor<HoleParams> = {
  id: 'HOLE_TOOL',
  label: 'hole',
  icon,
  info: 'creates hole features',
  path: __dirname,
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

    //make base hole cylinder and fancy modifer geometry for countersink/counterbore 
    oci.pcylinder("result", params.diameter / 2, params.depth);

    if (params.holeType === "counterbore") {
      oci.pcylinder("holeModifier", params.counterBoreDiameter / 2, params.counterBoreDepth);
    }

    if (params.holeType === "countersink") {
      const heightFromDiameterAndAngle = (params.countersinkDiameter - params.diameter) / (Math.tan((params.countersinkAngle / 180 * Math.PI) / 2));
      oci.pcone("holeModifier", params.countersinkDiameter / 2, 0, heightFromDiameterAndAngle);
    }



    //union the base hole and the hole modifier together 
    if (params.holeType !== "normal") {
      oci.bop("result", "holeModifier");
      oci.bopfuse("result");
    }

    //load sketch information from face
    const sketch = ctx.sketchStorageService.readSketch(params.sketch.id);
    const csys =params.sketch.csys;

    const holeSolids = [];

    //Look for circles and make hole solids using center points
    sketch.loops.forEach((holeSourceElement) => {
      if (holeSourceElement instanceof Circle) {
        holeSolids.push(makeHoleSolid(
          {
            id: "holeC" + holeSourceElement.id,
            x: holeSourceElement.c.x,
            y: holeSourceElement.c.y,
            z: holeSourceElement.c.z,
            csys,
            invert: params.invertDirection
          }, ctx));
      }
    })

    //check for point objects and make hole solids on locations
    sketch.points.forEach((holeSourceElement) => {
      holeSolids.push(makeHoleSolid(
        {
          id: "holeP" + holeSourceElement.id,
          x: holeSourceElement.point.x,
          y: holeSourceElement.point.y,
          z: holeSourceElement.point.z,
          csys,
          invert: params.invertDirection
        }, ctx));
    })


    return occ.utils.applyBooleanModifier(holeSolids, params.boolean);


  },
  form: [
    {
      type: 'selection',
      name: 'sketch',
      capture: [EntityKind.FACE],
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

    {
      name: "invertDirection",
      label: 'Invert Direction',
      type: "checkbox",
      defaultValue: false
    },

    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
      simplify: true,
      defaultValue: "SUBTRACT",
    }
  ],
}


function makeHoleSolid(holePoint, ctx) {
  const occ = ctx.occService;
  const oci = occ.commandInterface;
  const NewHoleName = holePoint.id;
  oci.copy("result", NewHoleName);

  const flipped = new Matrix3x4();
  if (holePoint.invert === false) flipped.myy = -1;


  const tr = new Matrix3x4().setTranslation(holePoint.x, holePoint.y, holePoint.z);
  const location = holePoint.csys.outTransformation.combine(tr.combine(flipped));
  SetLocation(NewHoleName, location.toFlatArray());
  return occ.io.getShell(NewHoleName);
}




//Face ID templates
function productionAnalyser() {
  return new ExpectedOrderProductionAnalyzer(
    [
      {
        id: 'F:SIDE',
        productionInfo: {
          role: 'sweep'
        }
      },
      {
        id: 'F:BASE',
        productionInfo: {
          role: 'base'
        }
      },
      {
        id: 'F:LID',
        productionInfo: {
          role: 'lid'
        }
      },

    ],
    [],
    []
  );

}
