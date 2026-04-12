import {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import {ControlPoint} from '../models/ControlPoint/ControlPoint.entity';
import {makeGrid} from '../patchCageHelpers';
import {SurfaceSet} from '../SurfaceSet';
import {lerp as vlerp} from 'math/vec';
import {V, Vlerp} from './helpers';
import {LocalBoundingCurveCache} from '../models/BoundingCurve/buildBoundingCurves';
import type {SurfacingEditor} from '../SurfacingEditor';

export function createPatchCylinder(
  ctx: SurfacingEditor, radius: number, height: number, segments: number = 4
): void {
  const curveCache = new LocalBoundingCurveCache();
  const makePatch = (grid: ControlPoint[][]) =>
    new NurbsSurface(ctx, grid, curveCache.curvesFor(ctx, grid));
  const hz = height / 2;
  const k = 4 * (Math.SQRT2 - 1) / 3; // cubic Bézier circle constant
  const quarterAngles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];

  // Z levels for wall control points
  const zLevels = [-hz, -hz/3, hz/3, hz];

  // Build per-row vertex rings
  const rings: ControlPoint[][] = []; // rings[row] = array of 12 verts around circumference

  for (let row = 0; row < 4; row++) {
    const z = zLevels[row];
    const ring: ControlPoint[] = [];

    for (let q = 0; q < 4; q++) {
      const a0 = quarterAngles[q], a1 = quarterAngles[(q+1)%4];
      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      // 4 control points for quarter arc
      const cp0 = V(ctx, radius*cos0, radius*sin0, z);
      const cp1 = V(ctx, radius*(cos0 - k*sin0), radius*(sin0 + k*cos0), z);
      const cp2 = V(ctx, radius*(cos1 + k*sin1), radius*(sin1 - k*cos1), z);
      // cp3 = next quarter's cp0 (shared)

      ring.push(cp0, cp1, cp2);
    }
    rings.push(ring);
  }

  // Now rings[row] has 12 vertices: [q0_cp0, q0_cp1, q0_cp2, q1_cp0, q1_cp1, q1_cp2, ...]
  // Quarter q uses: ring[q*3], ring[q*3+1], ring[q*3+2], ring[((q+1)%4)*3]

  // Build 4 wall patches sharing boundary vertices
  const surfaces: NurbsSurface[] = [];
  for (let q = 0; q < 4; q++) {
    const qn = (q + 1) % 4;
    const grid: ControlPoint[][] = [];
    for (let row = 0; row < 4; row++) {
      grid.push([
        rings[row][q*3],      // on-circle start
        rings[row][q*3 + 1],  // handle
        rings[row][q*3 + 2],  // handle
        rings[row][qn*3],     // on-circle end (SHARED with next quarter's col 0)
      ]);
    }
    surfaces.push(makePatch(grid));
  }

  // ---- Caps with center diamond ----
  const dFrac = 0.33;

  for (let cap = 0; cap < 2; cap++) {
    const wallRow = cap === 0 ? 0 : 3;
    const z = cap === 0 ? -hz : hz;

    // On-circle corner vertices (shared with wall)
    const arcCorners: ControlPoint[] = [];
    for (let q = 0; q < 4; q++) {
      arcCorners.push(rings[wallRow][q * 3]); // SAME vertex instance as wall
    }

    // Diamond corner vertices
    const dC: ControlPoint[] = arcCorners.map(c => {
      const p = vlerp([0, 0, z], c.position, dFrac);
      return V(ctx, p[0], p[1], p[2]);
    });

    // Radial edge vertices (shared between adjacent quarter cap patches)
    const radialVerts: ControlPoint[][] = [];
    for (let q = 0; q < 4; q++) {
      radialVerts.push([
        dC[q],
        Vlerp(ctx, dC[q], arcCorners[q], 1/3),
        Vlerp(ctx, dC[q], arcCorners[q], 2/3),
        arcCorners[q], // SAME as wall corner
      ]);
    }

    // Diamond patch: grid corners are dC[0], dC[1], dC[3], dC[2]
    const dg = makeGrid(ctx, [dC[0], dC[1], dC[3], dC[2]]);
    surfaces.push(makePatch(dg));

    // Extract diamond edge vertices for each quarter (SHARED by identity with diamond grid)
    const diamondEdges: [ControlPoint, ControlPoint, ControlPoint, ControlPoint][] = [
      [dg[0][0], dg[0][1], dg[0][2], dg[0][3]],  // q=0: dC[0]→dC[1], bottom row
      [dg[0][3], dg[1][3], dg[2][3], dg[3][3]],  // q=1: dC[1]→dC[2], right col
      [dg[3][3], dg[3][2], dg[3][1], dg[3][0]],  // q=2: dC[2]→dC[3], top row reversed
      [dg[3][0], dg[2][0], dg[1][0], dg[0][0]],  // q=3: dC[3]→dC[0], left col reversed
    ];

    // 4 quarter cap patches
    for (let q = 0; q < 4; q++) {
      const qn = (q + 1) % 4;

      // Arc handle vertices from wall (SHARED)
      const arcH1 = rings[wallRow][q*3 + 1];
      const arcH2 = rings[wallRow][q*3 + 2];

      // Diamond edge vertices (SHARED with diamond grid)
      const [, de1, de2, ] = diamondEdges[q];

      const grid: ControlPoint[][] = [
        // Row 0: diamond edge (shared with diamond patch)
        diamondEdges[q],
        // Row 1: interpolated
        [radialVerts[q][1], Vlerp(ctx, de1, arcH1, 1/3), Vlerp(ctx, de2, arcH2, 1/3), radialVerts[qn][1]],
        // Row 2: interpolated
        [radialVerts[q][2], Vlerp(ctx, de1, arcH1, 2/3), Vlerp(ctx, de2, arcH2, 2/3), radialVerts[qn][2]],
        // Row 3: arc edge (SHARED with wall)
        [arcCorners[q], arcH1, arcH2, arcCorners[qn]],
      ];

      surfaces.push(makePatch(grid));
    }
  }

  ctx.scene.createGroup('Cylinder', surfaces);

  // Surface sets: walls form the cylindrical side, each cap is one set of 5 patches.
  // Layout: [0..3] walls, [4..8] bottom cap (diamond + 4 quarters), [9..13] top cap.
  const sideSet = new SurfaceSet('side');
  const bottomSet = new SurfaceSet('bottom');
  const topSet = new SurfaceSet('top');
  for (let i = 0; i <= 3; i++) sideSet.add(surfaces[i]);
  for (let i = 4; i <= 8; i++) bottomSet.add(surfaces[i]);
  for (let i = 9; i <= 13; i++) topSet.add(surfaces[i]);

}
