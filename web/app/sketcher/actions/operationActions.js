import {Generator} from "../id-generator";
import {SketchGenerator} from "../generators/sketchGenerator";
import {MirrorGeneratorSchema} from "../generators/mirrorGenerator";
import {MirrorGeneratorIcon} from "../icons/generators/GeneratorIcons";

export default [

  {
    id: 'Mirror',
    shortName: 'Mirror',
    kind: 'Generator',
    description: 'Mirror Objects',
    icon: MirrorGeneratorIcon,

    wizard: MirrorGeneratorSchema.params ,

    invoke: (ctx, params) => {

      const {viewer} = ctx;
      const generator = new SketchGenerator(params, MirrorGeneratorSchema);
      viewer.parametricManager.addGenerator(generator);

    }

  },

];

