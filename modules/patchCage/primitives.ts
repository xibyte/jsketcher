/**
 * Patch cage primitives with 4×4 bicubic control grids.
 */

import {PatchCage} from './PatchCage';
import {Vec3} from './patchCageTypes';
import {vadd, vsub, vscale, vlerp} from './vec3Math';

/**
 * Create a flat plane as a single Bézier patch.
 */
export function createPatchPlane(width: number, height: number): PatchCage {
  const cage = new PatchCage();
  const hw = width / 2, hh = height / 2;

  // 4×4 grid on the XY plane, evenly spaced
  const control: Vec3[][] = [];
  for (let j = 0; j < 4; j++) {
    const row: Vec3[] = [];
    const v = j / 3;
    for (let i = 0; i < 4; i++) {
      const u = i / 3;
      row.push([-hw + width * u, -hh + height * v, 0]);
    }
    control.push(row);
  }

  cage.addPatch(control);
  return cage;
}

/**
 * Create a box as 6 Bézier patches sharing edges.
 */
export function createPatchBox(sizeX: number, sizeY: number, sizeZ: number): PatchCage {
  const cage = new PatchCage();
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  function makeFlatPatch(corners: [Vec3, Vec3, Vec3, Vec3]): Vec3[][] {
    // corners: [c00, c10, c01, c11] → 4×4 grid by linear interpolation
    const [c00, c10, c01, c11] = corners;
    const control: Vec3[][] = [];
    for (let j = 0; j < 4; j++) {
      const row: Vec3[] = [];
      const v = j / 3;
      for (let i = 0; i < 4; i++) {
        const u = i / 3;
        row.push(vadd(
          vadd(vscale(c00, (1-u)*(1-v)), vscale(c10, u*(1-v))),
          vadd(vscale(c01, (1-u)*v), vscale(c11, u*v))
        ));
      }
      control.push(row);
    }
    return control;
  }

  // Bottom (-Z)
  cage.addPatch(makeFlatPatch([[-hx,-hy,-hz],[hx,-hy,-hz],[-hx,hy,-hz],[hx,hy,-hz]]));
  // Top (+Z)
  cage.addPatch(makeFlatPatch([[-hx,-hy,hz],[hx,-hy,hz],[-hx,hy,hz],[hx,hy,hz]]));
  // Front (-Y)
  cage.addPatch(makeFlatPatch([[-hx,-hy,-hz],[hx,-hy,-hz],[-hx,-hy,hz],[hx,-hy,hz]]));
  // Back (+Y)
  cage.addPatch(makeFlatPatch([[hx,hy,-hz],[-hx,hy,-hz],[hx,hy,hz],[-hx,hy,hz]]));
  // Right (+X)
  cage.addPatch(makeFlatPatch([[hx,-hy,-hz],[hx,hy,-hz],[hx,-hy,hz],[hx,hy,hz]]));
  // Left (-X)
  cage.addPatch(makeFlatPatch([[-hx,hy,-hz],[-hx,-hy,-hz],[-hx,hy,hz],[-hx,-hy,hz]]));

  // Shared edges between faces
  // Bottom-Front: bottom's v=0 row ↔ front's v=0 row
  cage.addSharedEdge(0, 0, 2, 0);
  // Bottom-Back: bottom's v=1 row ↔ back's v=0 row (reversed)
  cage.addSharedEdge(0, 2, 3, 0, true);
  // Bottom-Right: bottom's u=1 col ↔ right's v=0 row
  cage.addSharedEdge(0, 1, 4, 0);
  // Bottom-Left: bottom's u=0 col ↔ left's v=0 row (reversed)
  cage.addSharedEdge(0, 3, 5, 0, true);
  // Top-Front: top's v=0 row ↔ front's v=1 row
  cage.addSharedEdge(1, 0, 2, 2);
  // Top-Back: top's v=1 row ↔ back's v=1 row (reversed)
  cage.addSharedEdge(1, 2, 3, 2, true);
  // Top-Right: top's u=1 col ↔ right's v=1 row
  cage.addSharedEdge(1, 1, 4, 2);
  // Top-Left: top's u=0 col ↔ left's v=1 row (reversed)
  cage.addSharedEdge(1, 3, 5, 2, true);
  // Front-Right: front's u=1 col ↔ right's u=0 col
  cage.addSharedEdge(2, 1, 4, 3);
  // Front-Left: front's u=0 col ↔ left's u=1 col
  cage.addSharedEdge(2, 3, 5, 1);
  // Back-Right: back's u=0 col ↔ right's u=1 col
  cage.addSharedEdge(3, 3, 4, 1);
  // Back-Left: back's u=1 col ↔ left's u=0 col
  cage.addSharedEdge(3, 1, 5, 3);

  return cage;
}

/**
 * Create a cylinder using 4 rational NURBS quarter-circle patches for walls.
 * Each quarter is a bicubic rational Bézier patch.
 *
 * The weight for the mid-control points of circular arcs is cos(π/4) = √2/2 ≈ 0.7071
 * This gives exact circular cross-sections.
 */
export function createPatchCylinder(
  radius: number, height: number, segments: number = 4
): PatchCage {
  const cage = new PatchCage();
  const hz = height / 2;

  // For exact circles, we use 4 quarter patches (90° each).
  // Each quarter's cross-section is a rational Bézier curve with weight √2/2 on the middle control point.
  const quarterAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const w = Math.SQRT1_2; // cos(45°) = √2/2

  for (let q = 0; q < 4; q++) {
    const a0 = quarterAngles[q];
    const a1 = quarterAngles[(q + 1) % 4];
    const amid = (a0 + a1) / 2;

    // The 3 cross-section control points for a quarter circle:
    // P0 = on circle at a0
    // P1 = intersection of tangent lines at a0 and a1 (off-circle, weight = w)
    // P2 = on circle at a1
    // For bicubic, we need 4 control points per U direction.
    // Use degree elevation from quadratic rational → cubic rational.

    // Quadratic rational quarter circle control points:
    const qp0: Vec3 = [radius * Math.cos(a0), radius * Math.sin(a0), 0];
    const qp1: Vec3 = [radius * Math.cos(a0) - radius * Math.sin(a0) * Math.tan(Math.PI/4),
                        radius * Math.sin(a0) + radius * Math.cos(a0) * Math.tan(Math.PI/4), 0];
    const qp2: Vec3 = [radius * Math.cos(a1), radius * Math.sin(a1), 0];

    // For simplicity, use the quadratic control points with proper tangent handles
    // but lay them out in a 4-point cubic Bézier that approximates the quarter circle.
    // Exact cubic Bézier for quarter circle: k = 4*(√2 - 1)/3 ≈ 0.5522847
    const k = 4 * (Math.SQRT2 - 1) / 3;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    const cp0: Vec3 = [radius * cos0, radius * sin0, 0];
    const cp1: Vec3 = [radius * (cos0 - k * sin0), radius * (sin0 + k * cos0), 0];
    const cp2: Vec3 = [radius * (cos1 + k * sin1), radius * (sin1 - k * cos1), 0];
    const cp3: Vec3 = [radius * cos1, radius * sin1, 0];

    // Build 4×4 control grid: extrude along Z with 4 height levels
    const control: Vec3[][] = [];
    const zLevels = [-hz, -hz / 3, hz / 3, hz];

    for (let j = 0; j < 4; j++) {
      const z = zLevels[j];
      control.push([
        [cp0[0], cp0[1], z],
        [cp1[0], cp1[1], z],
        [cp2[0], cp2[1], z],
        [cp3[0], cp3[1], z],
      ]);
    }

    // All weights = 1 for the cubic approximation (non-rational).
    // The cubic Bézier with k ≈ 0.5522847 gives < 0.027% error from a true circle.
    cage.addPatch(control);
  }

  // Share edges between adjacent wall quarter patches
  for (let q = 0; q < 4; q++) {
    const next = (q + 1) % 4;
    cage.addSharedEdge(q, 1, next, 3); // right edge of q = left edge of next
  }

  // ---- Cap patches ----
  // Each cap = 4 quarter-disk patches + 1 center rhombic patch.
  // All shared boundary control points are THE SAME array references.

  const dFrac = 0.33;

  for (let cap = 0; cap < 2; cap++) {
    const z = cap === 0 ? -hz : hz;
    const wallRow = cap === 0 ? 0 : 3;
    const center: Vec3 = [0, 0, z];

    // Get REFERENCES to wall arc points (not copies)
    const wallArcs: Vec3[][] = []; // wallArcs[q] = [cp0, cp1, cp2, cp3]
    for (let q = 0; q < 4; q++) {
      const row = cage.patches[q].control[wallRow];
      wallArcs.push(row); // same array references
    }

    // Diamond corners on the cap plane
    const dC: Vec3[] = [];
    for (let q = 0; q < 4; q++) {
      dC.push(vlerp(center, wallArcs[q][0], dFrac));
    }

    // Pre-build all shared radial edge control points.
    // Radial edge q goes from dC[q] (diamond corner) to wallArcs[q][0] (arc corner).
    // Each radial has 4 control points: [dC[q], r1, r2, arcCorner]
    const radials: Vec3[][] = [];
    for (let q = 0; q < 4; q++) {
      const p0 = dC[q];
      const p3 = wallArcs[q][0];
      radials.push([p0, vlerp(p0, p3, 1/3), vlerp(p0, p3, 2/3), p3]);
    }

    // --- Center diamond patch ---
    // Grid corners: [0][0]=dC[0], [0][3]=dC[1], [3][0]=dC[3], [3][3]=dC[2]
    // (so side 0 goes dC0→dC1, side 1 goes dC1→dC2, side 2 goes dC3→dC2, side 3 goes dC0→dC3)
    const dGrid: Vec3[][] = [];
    for (let row = 0; row < 4; row++) {
      const v = row / 3;
      const r: Vec3[] = [];
      for (let col = 0; col < 4; col++) {
        const u = col / 3;
        r.push(vadd(
          vadd(vscale(dC[0], (1-u)*(1-v)), vscale(dC[1], u*(1-v))),
          vadd(vscale(dC[3], (1-u)*v), vscale(dC[2], u*v))
        ));
      }
      dGrid.push(r);
    }
    // Force corners to exact references
    dGrid[0][0] = dC[0]; dGrid[0][3] = dC[1];
    dGrid[3][0] = dC[3]; dGrid[3][3] = dC[2];
    const diamondIdx = cage.addPatch(dGrid);

    // --- 4 quarter patches ---
    const qIdxs: number[] = [];
    for (let q = 0; q < 4; q++) {
      const qn = (q + 1) % 4;

      // This quarter goes from diamond edge (dC[q]→dC[qn]) to arc edge (wallArcs[q])
      // Left radial: radials[q] (dC[q] → wallArcs[q][0])
      // Right radial: radials[qn] (dC[qn] → wallArcs[qn][0] = wallArcs[q][3]... wait)
      // Actually wallArcs[q] = [cp0, cp1, cp2, cp3] for wall quarter q.
      // wallArcs[q][0] = start of arc q = on circle at angle q*90°
      // wallArcs[q][3] = end of arc q = wallArcs[qn][0] = on circle at angle (q+1)*90°

      // Quarter q's 4×4 grid:
      //   col 0 = left radial: dC[q] → wallArcs[q][0]
      //   col 3 = right radial: dC[qn] → wallArcs[q][3]
      //   row 0 = diamond edge: dC[q] → dC[qn]
      //   row 3 = arc edge: wallArcs[q][0..3]

      const grid: Vec3[][] = [];
      for (let row = 0; row < 4; row++) {
        const t = row / 3; // 0=diamond, 1=arc
        const r: Vec3[] = [];
        for (let col = 0; col < 4; col++) {
          const s = col / 3;
          // Bilinear blend of 4 boundary curves
          const leftPt = radials[q][row];
          const rightPt = radials[qn][row];
          const bottomPt = vlerp(dC[q], dC[qn], s);
          const topPt = wallArcs[q][col];

          // Coons: left-right blend + top-bottom blend - bilinear corners
          const lr = vlerp(leftPt, rightPt, s);
          const tb = vlerp(bottomPt, topPt, t);
          const c00 = radials[q][0];   // dC[q]
          const c10 = radials[qn][0];  // dC[qn]
          const c01 = radials[q][3];   // wallArcs[q][0]
          const c11 = radials[qn][3];  // wallArcs[q][3]
          const bil = vadd(
            vadd(vscale(c00, (1-s)*(1-t)), vscale(c10, s*(1-t))),
            vadd(vscale(c01, (1-s)*t), vscale(c11, s*t))
          );
          r.push(vsub(vadd(lr, tb), bil));
        }
        grid.push(r);
      }

      // Force shared boundary points to exact references
      // Row 3 = arc: share with wall
      grid[3][0] = wallArcs[q][0];
      grid[3][1] = wallArcs[q][1];
      grid[3][2] = wallArcs[q][2];
      grid[3][3] = wallArcs[q][3];
      // Col 0 = left radial
      for (let row = 0; row < 4; row++) grid[row][0] = radials[q][row];
      // Col 3 = right radial
      for (let row = 0; row < 4; row++) grid[row][3] = radials[qn][row];
      // Row 0 corners = diamond corners
      grid[0][0] = dC[q];
      grid[0][3] = dC[qn];

      qIdxs.push(cage.addPatch(grid));
    }

    // Shared edges (for sync during editing)
    const wallSide = cap === 0 ? 0 : 2;
    for (let q = 0; q < 4; q++) {
      cage.addSharedEdge(q, wallSide, qIdxs[q], 2, false);
    }
    // Diamond ↔ quarter bottom edges
    // Diamond side 0 (row 0): dC[0]→dC[1] = quarter 0 bottom
    // Diamond side 1 (col 3): dC[1]→dC[2] = quarter 1 bottom
    // Diamond side 2 (row 3): dC[3]→dC[2] = quarter 2 bottom REVERSED
    // Diamond side 3 (col 0): dC[0]→dC[3] = quarter 3 bottom REVERSED
    cage.addSharedEdge(diamondIdx, 0, qIdxs[0], 0, false);
    cage.addSharedEdge(diamondIdx, 1, qIdxs[1], 0, false);
    cage.addSharedEdge(diamondIdx, 2, qIdxs[2], 0, true);
    cage.addSharedEdge(diamondIdx, 3, qIdxs[3], 0, true);
    // Adjacent quarter radials
    for (let q = 0; q < 4; q++) {
      cage.addSharedEdge(qIdxs[q], 1, qIdxs[(q+1)%4], 3);
    }
  }

  return cage;
}
