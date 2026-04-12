import {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import {makeGrid} from '../patchCageHelpers';
import {SurfaceSet} from '../SurfaceSet';
import {V} from './helpers';
import {createBoundingCurves} from '../models/BoundingCurve/buildBoundingCurves';
import type {SurfacingEditor} from '../SurfacingEditor';

export function createPatchPlane(editor: SurfacingEditor, width: number, height: number): void {
  const hw = width / 2, hh = height / 2;

  const c00 = V(editor, -hw, -hh, 0), c10 = V(editor, hw, -hh, 0);
  const c01 = V(editor, -hw, hh, 0), c11 = V(editor, hw, hh, 0);

  const grid = makeGrid(editor, [c00, c10, c01, c11]);
  const surface = new NurbsSurface(editor, grid, createBoundingCurves(editor, grid));
  editor.scene.createGroup('Plane', [surface]);

  const set = new SurfaceSet('plane');
  set.add(surface);
}
