import {Scene, NurbsSurface} from '../models/Scene/Scene.entity';
import {makeGrid} from '../patchCageHelpers';
import {SurfaceSet} from '../SurfaceSet';
import {V} from './helpers';

export function createPatchPlane(width: number, height: number): Scene {
  const scene = new Scene();
  const hw = width / 2, hh = height / 2;

  const c00 = V(-hw, -hh, 0), c10 = V(hw, -hh, 0);
  const c01 = V(-hw, hh, 0), c11 = V(hw, hh, 0);

  const surface = new NurbsSurface(makeGrid([c00, c10, c01, c11]));
  scene.surfaces.push(surface);
  scene.createGroup('Plane', [0]);

  const set = new SurfaceSet('plane');
  set.add(surface);

  return scene;
}
