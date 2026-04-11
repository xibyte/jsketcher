import {Scene, NurbsSurface} from '../models/Scene/Scene.entity';
import {makeGrid} from '../patchCageHelpers';
import {SurfaceSet} from '../SurfaceSet';
import {V} from './helpers';
import {createBoundingCurves} from '../models/BoundingCurve/buildBoundingCurves';
import type {SurfacingContext} from '../SurfacingContext';

export function createPatchPlane(ctx: SurfacingContext, width: number, height: number): Scene {
  const scene = new Scene(ctx);
  const hw = width / 2, hh = height / 2;

  const c00 = V(ctx, -hw, -hh, 0), c10 = V(ctx, hw, -hh, 0);
  const c01 = V(ctx, -hw, hh, 0), c11 = V(ctx, hw, hh, 0);

  const grid = makeGrid(ctx, [c00, c10, c01, c11]);
  const surface = new NurbsSurface(ctx, grid, createBoundingCurves(ctx, grid));
  scene.createGroup('Plane', [surface]);

  const set = new SurfaceSet('plane');
  set.add(surface);

  return scene;
}
