import {readBrep} from '../../../brep/io/brepIO';
import {BREPSceneSolid} from './brepSceneObject';

export function readShellEntityFromJson(data) {
  return new BREPSceneSolid(readBrep(data));  
}