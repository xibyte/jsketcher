import {box} from '../../../brep/brep-primitives'
import {BREPSceneSolid} from '../../scene/wrappers/brepSceneObject';
import {createPreviewer} from "../../preview/scenePreviewer";
import {createBoxGeometry} from "../../../../../modules/scene/geoms";

const METADATA = [
  ['width'   , 'number',  500,  {min: 0}],
  ['height'  , 'number',  500,  {min: 0}],
  ['depth'   , 'number',  500,  {min: 0}]
];

function createBox(solids, {width, height, depth}) {
  return {
    outdated: [],
    created: [new BREPSceneSolid(box(width, height, depth))]
  }
}

export default {
  id: 'BOX',
  metadata: METADATA,
  label: 'Box',
  info: 'creates new object box',
  paramsInfo: ({width, height, depth}) => `(${width}, ${height}, ${depth})`,
  previewer: createPreviewer(({width, height, depth}) => createBoxGeometry(width, height, depth)),
  run: createBox
};

