import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { negate } from 'cypress/types/lodash';


interface LoftParams {
  faces: MFace;
  boolean: BooleanDefinition
}

const LoftOperation: OperationDescriptor<LoftParams> = {
  id: 'loft',
  label: 'Loft',
  icon: 'img/cad/loft',
  info: 'Lofts 2D sketch',
  paramsInfo: ({ }) => `(${r()})`,
  run: (params: LoftParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    oci.polyline("w1",
      "0", "0", "0",
      "5", "0", "0",
      "5", "5", "0",
      "2", "3", "0",
      "0", "0", "0",
    );
    oci.polyline("w2",
      "0", "1", "3",
      "4", "1", "3",
      "4", "4", "3",
      "1", "3", "3",
      "0", "1", "3",
    );
    oci.polyline("w3",
      "0", "0", "5",
      "5", "0", "5",
      "5", "5", "5",
      "2", "3", "5",
      "0", "0", "5",
    );
    //# create the shape 
     var wires = [];
     wires.push("w1");
    // wires.push("w2");
    // wires.push("w3");

    console.log(params.faces);
    
    var itterator = 0; 

    var myReturnWire = occ.io.sketchLoader.pushContourAsWire(params.faces.sketchLoops[0].contour, itterator, params.faces.csys )

    wires.push(myReturnWire);


    oci.thrusections("th", "1", "0", ...wires );



    return {
      created:[occ.io.getShell("th")],
      consumed:[]
    }

  },


  form: [
    {
      type: 'selection',
      name: 'faces',
      capture: [EntityKind.FACE],
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}

export default LoftOperation;