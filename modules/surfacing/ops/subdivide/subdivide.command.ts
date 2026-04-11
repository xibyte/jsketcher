import {Scene, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {splitBezierRow} from '../../patchCageHelpers';

/**
 * Subdivide a patch into 9 sub-patches via De Casteljau at t=1/3 and t=2/3.
 * Each 3×3 cage cell becomes its own 4×4 NURBS patch.
 * Geometry is preserved exactly. Internal boundaries are watertight by construction.
 */
export function subdividePatch(scene: Scene, patchIdx: number): void {
  const sourcePatch = scene.surfaces[patchIdx];
  const sourceSet = sourcePatch.surfaceSet;
  const g = sourcePatch.grid;

  const ctx = scene.ctx;
  // Step 1: Split each of the 4 rows in U at t=1/3 then t=2/3 → 4 rows × 10 cols
  const uGrid: ControlPoint[][] = [];
  for (let row = 0; row < 4; row++) {
    const s1 = splitBezierRow(ctx, g[row][0], g[row][1], g[row][2], g[row][3], 1 / 3);
    const m1 = new ControlPoint(ctx, s1.mid[0], s1.mid[1], s1.mid[2]);
    const s2 = splitBezierRow(ctx, m1, s1.right[0], s1.right[1], g[row][3], 0.5);
    const m2 = new ControlPoint(ctx, s2.mid[0], s2.mid[1], s2.mid[2]);
    uGrid.push([
      g[row][0], s1.left[0], s1.left[1], m1,
      s2.left[0], s2.left[1], m2,
      s2.right[0], s2.right[1], g[row][3],
    ]);
  }

  // Step 2: Split each of the 10 columns in V at t=1/3 then t=2/3 → 10 rows × 10 cols
  const full: ControlPoint[][] = Array.from({length: 10}, () => new Array(10));
  for (let col = 0; col < 10; col++) {
    const s1 = splitBezierRow(ctx, uGrid[0][col], uGrid[1][col], uGrid[2][col], uGrid[3][col], 1 / 3);
    const m1 = new ControlPoint(ctx, s1.mid[0], s1.mid[1], s1.mid[2]);
    const s2 = splitBezierRow(ctx, m1, s1.right[0], s1.right[1], uGrid[3][col], 0.5);
    const m2 = new ControlPoint(ctx, s2.mid[0], s2.mid[1], s2.mid[2]);

    full[0][col] = uGrid[0][col];
    full[1][col] = s1.left[0];
    full[2][col] = s1.left[1];
    full[3][col] = m1;
    full[4][col] = s2.left[0];
    full[5][col] = s2.left[1];
    full[6][col] = m2;
    full[7][col] = s2.right[0];
    full[8][col] = s2.right[1];
    full[9][col] = uGrid[3][col];
  }

  // Step 3: Extract 3×3 = 9 sub-patches from the 10×10 grid.
  // Share BoundingCurves across internal seams by routing every new
  // sub-patch's curves through a single LocalBoundingCurveCache.
  const curveCache = new LocalBoundingCurveCache();
  curveCache.register(sourcePatch.boundingCurves.bottom);
  curveCache.register(sourcePatch.boundingCurves.right);
  curveCache.register(sourcePatch.boundingCurves.top);
  curveCache.register(sourcePatch.boundingCurves.left);

  const result: NurbsSurface[] = [];
  for (let vi = 0; vi < 3; vi++) {
    for (let ui = 0; ui < 3; ui++) {
      const r0 = vi * 3, c0 = ui * 3;
      const subGrid: ControlPoint[][] = [];
      for (let r = 0; r < 4; r++) {
        subGrid.push([full[r0 + r][c0], full[r0 + r][c0 + 1], full[r0 + r][c0 + 2], full[r0 + r][c0 + 3]]);
      }
      const sub = new NurbsSurface(ctx, subGrid, curveCache.curvesFor(ctx, subGrid));
      // Inherit the source surface's SurfaceSet so all 9 sub-patches
      // remain part of the same logical face.
      if (sourceSet) {
        sub.surfaceSet = sourceSet;
        sourceSet.surfaces.add(sub);
      }
      result.push(sub);
    }
  }

  // Drop the original from its set — its replacements are already in.
  if (sourceSet) {
    sourceSet.surfaces.delete(sourcePatch);
    sourcePatch.surfaceSet = null;
  }

  // Replace the source surface with the 9 sub-patches in its parent
  // (group or scene). One call handles both the tree splice and the
  // parent reassignment for the new surfaces.
  scene.replaceSurface(sourcePatch, result);
}
