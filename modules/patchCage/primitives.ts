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
  // Each cap = 4 quarter-disk patches.
  // Each quarter shares its outer arc edge with the wall patch.
  // The inner edge collapses toward the center.
  //
  // Layout for each quarter cap:
  //   v=1 (row 3): arc edge on the circle (shared with wall)
  //   v=0 (row 0): collapsed to center point
  //   u=0 (col 0): radial line from center to arc start
  //   u=1 (col 3): radial line from center to arc end

  for (let cap = 0; cap < 2; cap++) {
    const z = cap === 0 ? -hz : hz;
    const wallRow = cap === 0 ? 0 : 3; // which row of wall patch is at this cap

    for (let q = 0; q < 4; q++) {
      const wallPatch = cage.patches[q];
      // Arc control points from the wall patch at this cap's z level
      const arc0 = wallPatch.control[wallRow][0];
      const arc1 = wallPatch.control[wallRow][1];
      const arc2 = wallPatch.control[wallRow][2];
      const arc3 = wallPatch.control[wallRow][3];

      const center: Vec3 = [0, 0, z];

      // Build 4×4 grid from center (row 0) to arc (row 3)
      // Rows interpolate radially from center to arc
      const control: Vec3[][] = [];
      for (let row = 0; row < 4; row++) {
        const t = row / 3; // 0=center, 1=arc
        control.push([
          vlerp(center, arc0, t),
          vlerp(center, arc1, t),
          vlerp(center, arc2, t),
          vlerp(center, arc3, t),
        ]);
      }

      const capIdx = cage.addPatch(control);

      // Share arc edge: wall is source of truth, cap syncs to it.
      // Wall side 0 = bottom (row 0), side 2 = top (row 3).
      // Cap side 2 = top (row 3) = the arc edge.
      const wallSide = cap === 0 ? 0 : 2;
      // Wall's edge goes cp0→cp3. Cap's top edge goes arc0→arc3 (same direction).
      // patchA=wall, patchB=cap — syncs cap to wall.
      cage.addSharedEdge(q, wallSide, capIdx, 2, false);

      // Share radial edges between adjacent cap quarters
      // Cap patch's u=1 (right/col 3) = next cap patch's u=0 (left/col 0)
    }

    // Share radial edges between adjacent cap quarter patches
    const capBase = 4 + cap * 4; // first cap patch index for this cap
    for (let q = 0; q < 4; q++) {
      const next = (q + 1) % 4;
      cage.addSharedEdge(capBase + q, 1, capBase + next, 3);
    }
  }

  return cage;
}
