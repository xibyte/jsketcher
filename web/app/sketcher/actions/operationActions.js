import {Generator} from "../id-generator";
import {SketchGenerator} from "../generators/sketchGenerator";
import {MirrorGeneratorSchema} from "../generators/mirrorGenerator";
import {MirrorGeneratorIcon, OffsetGeneratorIcon} from "../icons/generators/GeneratorIcons";
import {OffsetTool} from "../tools/offset";

export default [

  {
    id: 'Mirror',
    shortName: 'Mirror',
    kind: 'Generator',
    description: 'Mirror Objects',
    icon: MirrorGeneratorIcon,

    wizard: MirrorGeneratorSchema.params,

    invoke: (ctx, params) => {

      const {viewer} = ctx;
      const generator = new SketchGenerator(params, MirrorGeneratorSchema);
      viewer.parametricManager.addGenerator(generator);

    }

  },


  {
    id: 'Offset',
    shortName: 'Offset',
    kind: 'Generator',
    description: 'Offset',
    icon: OffsetGeneratorIcon,

    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new OffsetTool(ctx.viewer));
    }

  },


];

