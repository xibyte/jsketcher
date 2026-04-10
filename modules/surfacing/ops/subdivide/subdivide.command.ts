import {PatchCage, CageVertex, NurbsPatch} from '../../models/Scene/Scene.entity';
import {splitBezierRow} from '../../patchCageHelpers';

/**
 * Subdivide a patch into 9 sub-patches via De Casteljau at t=1/3 and t=2/3.
 * Each 3×3 cage cell becomes its own 4×4 NURBS patch.
 * Geometry is preserved exactly. Internal boundaries are watertight by construction.
 */
export function subdividePatch(cage: PatchCage, patchIdx: number): void {
  const g = cage.patches[patchIdx].grid;

  // Step 1: Split each of the 4 rows in U at t=1/3 then t=2/3 → 4 rows × 10 cols
  const uGrid: CageVertex[][] = [];
  for (let row = 0; row < 4; row++) {
    const s1 = splitBezierRow(g[row][0], g[row][1], g[row][2], g[row][3], 1 / 3);
    const m1 = new CageVertex(s1.mid[0], s1.mid[1], s1.mid[2]);
    const s2 = splitBezierRow(m1, s1.right[0], s1.right[1], g[row][3], 0.5);
    const m2 = new CageVertex(s2.mid[0], s2.mid[1], s2.mid[2]);
    uGrid.push([
      g[row][0], s1.left[0], s1.left[1], m1,
      s2.left[0], s2.left[1], m2,
      s2.right[0], s2.right[1], g[row][3],
    ]);
  }

  // Step 2: Split each of the 10 columns in V at t=1/3 then t=2/3 → 10 rows × 10 cols
  const full: CageVertex[][] = Array.from({length: 10}, () => new Array(10));
  for (let col = 0; col < 10; col++) {
    const s1 = splitBezierRow(uGrid[0][col], uGrid[1][col], uGrid[2][col], uGrid[3][col], 1 / 3);
    const m1 = new CageVertex(s1.mid[0], s1.mid[1], s1.mid[2]);
    const s2 = splitBezierRow(m1, s1.right[0], s1.right[1], uGrid[3][col], 0.5);
    const m2 = new CageVertex(s2.mid[0], s2.mid[1], s2.mid[2]);

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

  // Step 3: Extract 3×3 = 9 sub-patches from the 10×10 grid
  const result: NurbsPatch[] = [];
  for (let vi = 0; vi < 3; vi++) {
    for (let ui = 0; ui < 3; ui++) {
      const r0 = vi * 3, c0 = ui * 3;
      const subGrid: CageVertex[][] = [];
      for (let r = 0; r < 4; r++) {
        subGrid.push([full[r0 + r][c0], full[r0 + r][c0 + 1], full[r0 + r][c0 + 2], full[r0 + r][c0 + 3]]);
      }
      result.push(new NurbsPatch(subGrid));
    }
  }

  cage.patches.splice(patchIdx, 1, ...result);
  cage.notifySplice(patchIdx, 1, result.length);
}
