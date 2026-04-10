import {PatchCage, NurbsPatch} from '../models/Scene/PatchCageCore';
import {makeGrid} from '../patchCageHelpers';
import {V} from './helpers';

export function createPatchPlane(width: number, height: number): PatchCage {
  const cage = new PatchCage();
  const hw = width / 2, hh = height / 2;

  const c00 = V(-hw, -hh, 0), c10 = V(hw, -hh, 0);
  const c01 = V(-hw, hh, 0), c11 = V(hw, hh, 0);

  cage.patches.push(new NurbsPatch(makeGrid([c00, c10, c01, c11])));
  cage.createGroup('Plane', [0]);
  return cage;
}
