import {readBrep} from '../../../brep/io/brepIO';
import {MBrepShell} from '../../model/mshell';

export function readShellEntityFromJson(data) {
  return new MBrepShell(readBrep(data));  
}