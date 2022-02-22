import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {MSketchLoop} from "cad/model/mloop";


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
  run: (params: LoftParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;



    console.log(params.loops);


    const wires = params.loops.map((loop, i) => {
      const shapeName = "loop/" + i;
      return occ.io.sketchLoader.pushContourAsWire(loop.contour, shapeName, loop.face.csys)
    });


    let loftType = 0;
    if (params.loftType == "smooth") loftType = 0;
    if (params.loftType == "sharp") loftType = 1;


    oci.thrusections("th", "1", loftType, ...wires );

    let tools = [];
    tools.push(occ.io.getShell("th"));

    return occ.utils.applyBooleanModifier(tools, params.boolean);

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
