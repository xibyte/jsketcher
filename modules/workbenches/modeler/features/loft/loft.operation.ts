import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { MSketchLoop } from "cad/model/mloop";
import { FromSketchProductionAnalyzer } from "cad/craft/production/productionAnalyzer";


interface LoftParams {
  loops: MSketchLoop[];
  boolean: BooleanDefinition;
  loftType: string;
}

export const LoftOperation: OperationDescriptor<LoftParams> = {
  id: 'LOFT',
  label: 'Loft',
  icon: 'img/cad/loft',
  info: 'Lofts 2D sketch',
  paramsInfo: ({ }) => `(${r()})`,
  run: async (params: LoftParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    let loftType = 0;
    if (params.loftType == "smooth") loftType = 0;
    if (params.loftType == "sharp") loftType = 1;

    console.log(params.loops);

    let sketches = [];

    const wires = params.loops.map((loop, i) => {
      const shapeName = "loop/" + i;
      const sketch = loop.parent
      sketches.push(sketch);

      return occ.io.sketchLoader.pushContourAsWire(loop.contour, shapeName, loop.face.csys).wire
    });

    console.log("This is the info you are looking for", sketches);



    sketches.forEach(function (item, index) {
      //console.log(item, index);
      if(params.loops[index].contour.segments.length > longestPath){
        longestPath = params.loops[index].contour.segments.length;

        primarySketch = params.loops[index].parent;
      }
      const face = occ.utils.sketchToFaces(ctx.sketchStorageService.readSketch(item.id), item.csys);
      sweepSources = face;
    });

    let sweepSources = [];

    let indexOfMostSegments = 0;
    let longestPath =  0;
    let primarySketch = {};

    sketches.forEach(function (item, index) {
      console.log(item, index);
      if(params.loops[index].contour.segments.length > longestPath){
        longestPath = params.loops[index].contour.segments.length;

        primarySketch = params.loops[index].parent;
      }
      const face = occ.utils.sketchToFaces(ctx.sketchStorageService.readSketch(item.id), item.csys);
      sweepSources = face;
    });


    

    const productionAnalyzer = new FromSketchProductionAnalyzer(sweepSources);



    oci.thrusections("th", "1", loftType, ...wires);

    let tools = [];
    tools.push(occ.io.getShell("th", productionAnalyzer));

    return occ.utils.applyBooleanModifier(tools, params.boolean, [], [],)

  },


  form: [
    {
      type: 'selection',
      name: 'loops',
      capture: [EntityKind.LOOP],
      label: 'Loops',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      label: 'Loft Type',
      name: "loftType",
      style: "dropdown",
      defaultValue: "smooth",
      values: ['smooth', 'sharp',],
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}