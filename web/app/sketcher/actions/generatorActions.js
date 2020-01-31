import {isInstanceOf} from "./matchUtils";
import {Generator} from "../id-generator";

export default [


  {
    shortName: 'Mirror',
    description: 'Mirror Objects',
    selectionMatcher: selection => isInstanceOf(selection[0]) && selection.length > 1,

    invoke: ctx => {
      const {viewer} = ctx;
      viewer.parametricManager.addGenerator(new Generator(GeneratorDefinitions.Mirror, [...viewer.selected]));
    }
  },

];

