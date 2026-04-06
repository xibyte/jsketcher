/**
 * Patch cage primitives using shared CageVertex instances.
 * Watertightness guaranteed by object identity — no synchronization.
 */

import {PatchCage, NurbsPatch, CageVertex, makeGrid} from './PatchCage';
import {Vec3} from './patchCageTypes';
import {vadd, vsub, vscale, vlerp} from './vec3Math';

function V(x: number, y: number, z: number): CageVertex {
  return new CageVertex(x, y, z);
}

/** Linear interpolation between two CageVertex, creating a new one */
function Vlerp(a: CageVertex, b: CageVertex, t: number): CageVertex {
  const p = vlerp(a.position, b.position, t);
  return new CageVertex(p[0], p[1], p[2]);
}

// =========================================================================
// Plane
// =========================================================================

export function createPatchPlane(width: number, height: number): PatchCage {
  const cage = new PatchCage();
  const hw = width / 2, hh = height / 2;

  const c00 = V(-hw, -hh, 0), c10 = V(hw, -hh, 0);
  const c01 = V(-hw, hh, 0), c11 = V(hw, hh, 0);

  cage.patches.push(new NurbsPatch(makeGrid([c00, c10, c01, c11])));
  return cage;
}

// =========================================================================
// Box
// =========================================================================

export function createPatchBox(sizeX: number, sizeY: number, sizeZ: number): PatchCage {
  const cage = new PatchCage();
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  // 8 shared corner vertices
  const v000 = V(-hx,-hy,-hz), v100 = V(hx,-hy,-hz);
  const v010 = V(-hx,hy,-hz),  v110 = V(hx,hy,-hz);
  const v001 = V(-hx,-hy,hz),  v101 = V(hx,-hy,hz);
  const v011 = V(-hx,hy,hz),   v111 = V(hx,hy,hz);

  // 12 shared edge interior vertices (2 per edge)
  // Bottom face edges
  const e01_1 = Vlerp(v000,v100,1/3), e01_2 = Vlerp(v000,v100,2/3); // bottom-front
  const e12_1 = Vlerp(v100,v110,1/3), e12_2 = Vlerp(v100,v110,2/3); // bottom-right
  const e23_1 = Vlerp(v010,v110,1/3), e23_2 = Vlerp(v010,v110,2/3); // bottom-back
  const e30_1 = Vlerp(v000,v010,1/3), e30_2 = Vlerp(v000,v010,2/3); // bottom-left

  // Top face edges
  const e45_1 = Vlerp(v001,v101,1/3), e45_2 = Vlerp(v001,v101,2/3);
  const e56_1 = Vlerp(v101,v111,1/3), e56_2 = Vlerp(v101,v111,2/3);
  const e67_1 = Vlerp(v011,v111,1/3), e67_2 = Vlerp(v011,v111,2/3);
  const e74_1 = Vlerp(v001,v011,1/3), e74_2 = Vlerp(v001,v011,2/3);

  // Vertical edges
  const e04_1 = Vlerp(v000,v001,1/3), e04_2 = Vlerp(v000,v001,2/3);
  const e15_1 = Vlerp(v100,v101,1/3), e15_2 = Vlerp(v100,v101,2/3);
  const e26_1 = Vlerp(v110,v111,1/3), e26_2 = Vlerp(v110,v111,2/3);
  const e37_1 = Vlerp(v010,v011,1/3), e37_2 = Vlerp(v010,v011,2/3);

  // 6 faces, each sharing corner + edge vertices with neighbors
  // Bottom (-Z): corners v000,v100,v010,v110
  cage.patches.push(new NurbsPatch(makeGrid([v000,v100,v010,v110], {
    bottom: [v000, e01_1, e01_2, v100],
    right: [v100, e12_1, e12_2, v110],
    top: [v010, e23_1, e23_2, v110],
    left: [v000, e30_1, e30_2, v010],
  })));

  // Top (+Z): corners v001,v101,v011,v111
  cage.patches.push(new NurbsPatch(makeGrid([v001,v101,v011,v111], {
    bottom: [v001, e45_1, e45_2, v101],
    right: [v101, e56_1, e56_2, v111],
    top: [v011, e67_1, e67_2, v111],
    left: [v001, e74_1, e74_2, v011],
  })));

  // Front (-Y): corners v000,v100,v001,v101
  cage.patches.push(new NurbsPatch(makeGrid([v000,v100,v001,v101], {
    bottom: [v000, e01_1, e01_2, v100],
    right: [v100, e15_1, e15_2, v101],
    top: [v001, e45_1, e45_2, v101],
    left: [v000, e04_1, e04_2, v001],
  })));

  // Back (+Y): corners v110,v010,v111,v011
  cage.patches.push(new NurbsPatch(makeGrid([v110,v010,v111,v011], {
    bottom: [v110, e23_2, e23_1, v010], // reversed
    right: [v010, e37_1, e37_2, v011],
    top: [v111, e67_2, e67_1, v011], // reversed
    left: [v110, e26_1, e26_2, v111],
  })));

  // Right (+X): corners v100,v110,v101,v111
  cage.patches.push(new NurbsPatch(makeGrid([v100,v110,v101,v111], {
    bottom: [v100, e12_1, e12_2, v110],
    right: [v110, e26_1, e26_2, v111],
    top: [v101, e56_1, e56_2, v111],
    left: [v100, e15_1, e15_2, v101],
  })));

  // Left (-X): corners v010,v000,v011,v001
  cage.patches.push(new NurbsPatch(makeGrid([v010,v000,v011,v001], {
    bottom: [v010, e30_2, e30_1, v000], // reversed
    right: [v000, e04_1, e04_2, v001],
    top: [v011, e74_2, e74_1, v001], // reversed
    left: [v010, e37_1, e37_2, v011],
  })));

  return cage;
}

// =========================================================================
// Cylinder
// =========================================================================

export function createPatchCylinder(
  radius: number, height: number, segments: number = 4
): PatchCage {
  const cage = new PatchCage();
  const hz = height / 2;
  const k = 4 * (Math.SQRT2 - 1) / 3; // cubic Bézier circle constant
  const quarterAngles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];

  // Z levels for wall control points
  const zLevels = [-hz, -hz/3, hz/3, hz];

  // Pre-create ALL shared vertices for the wall
  // wallVerts[q][row][col] but we only need to share:
  //   - Column 0 and column 3 between adjacent quarters
  //   - All rows shared vertically within the same quarter

  // Create wall vertices. wallV[row][vertIdx] where vertIdx goes around circumference.
  // Each quarter has 4 U-direction vertices. Adjacent quarters share the boundary vertex.
  // Total unique circumference positions = 4 quarters × 3 unique + 1 shared = 13? No.
  // quarter 0: col0=A0, col1=B0, col2=C0, col3=A1 (shared with quarter 1 col0)
  // So total unique per row = 4 * 3 = 12 (4 on-circle + 8 handles)

  // Build per-row vertex rings
  const rings: CageVertex[][] = []; // rings[row] = array of 12 verts around circumference

  for (let row = 0; row < 4; row++) {
    const z = zLevels[row];
    const ring: CageVertex[] = [];

    for (let q = 0; q < 4; q++) {
      const a0 = quarterAngles[q], a1 = quarterAngles[(q+1)%4];
      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      // 4 control points for quarter arc
      const cp0 = V(radius*cos0, radius*sin0, z);
      const cp1 = V(radius*(cos0 - k*sin0), radius*(sin0 + k*cos0), z);
      const cp2 = V(radius*(cos1 + k*sin1), radius*(sin1 - k*cos1), z);
      // cp3 = next quarter's cp0 (shared)

      ring.push(cp0, cp1, cp2);
    }
    rings.push(ring);
  }

  // Now rings[row] has 12 vertices: [q0_cp0, q0_cp1, q0_cp2, q1_cp0, q1_cp1, q1_cp2, ...]
  // Quarter q uses: ring[q*3], ring[q*3+1], ring[q*3+2], ring[((q+1)%4)*3]

  // Build 4 wall patches sharing boundary vertices
  for (let q = 0; q < 4; q++) {
    const qn = (q + 1) % 4;
    const grid: CageVertex[][] = [];
    for (let row = 0; row < 4; row++) {
      grid.push([
        rings[row][q*3],      // on-circle start
        rings[row][q*3 + 1],  // handle
        rings[row][q*3 + 2],  // handle
        rings[row][qn*3],     // on-circle end (SHARED with next quarter's col 0)
      ]);
    }
    cage.patches.push(new NurbsPatch(grid));
  }

  // ---- Caps with center diamond ----
  const dFrac = 0.33;

  for (let cap = 0; cap < 2; cap++) {
    const wallRow = cap === 0 ? 0 : 3;
    const z = cap === 0 ? -hz : hz;

    // On-circle corner vertices (shared with wall)
    const arcCorners: CageVertex[] = [];
    for (let q = 0; q < 4; q++) {
      arcCorners.push(rings[wallRow][q * 3]); // SAME vertex instance as wall
    }

    // Diamond corner vertices
    const dC: CageVertex[] = arcCorners.map(c => {
      const p = vlerp([0, 0, z], c.position, dFrac);
      return V(p[0], p[1], p[2]);
    });

    // Radial edge vertices (shared between adjacent quarter cap patches)
    // radialVerts[q] = [dC[q], mid1, mid2, arcCorners[q]] — 4 verts, endpoints shared
    const radialVerts: CageVertex[][] = [];
    for (let q = 0; q < 4; q++) {
      radialVerts.push([
        dC[q],
        Vlerp(dC[q], arcCorners[q], 1/3),
        Vlerp(dC[q], arcCorners[q], 2/3),
        arcCorners[q], // SAME as wall corner
      ]);
    }

    // Diamond patch: grid corners are dC[0], dC[1], dC[3], dC[2]
    const diamondGrid = makeGrid([dC[0], dC[1], dC[3], dC[2]]);
    cage.patches.push(new NurbsPatch(diamondGrid));

    // 4 quarter cap patches
    for (let q = 0; q < 4; q++) {
      const qn = (q + 1) % 4;

      // This quarter: from diamond edge to arc edge
      // Row 0 (v=0): diamond edge from dC[q] to dC[qn]
      // Row 3 (v=1): arc edge from wall (shared vertices)
      // Col 0 (u=0): radial from dC[q] to arcCorners[q]
      // Col 3 (u=1): radial from dC[qn] to arcCorners[qn]

      // Get arc handle vertices from wall (SHARED)
      const arcH1 = rings[wallRow][q*3 + 1];
      const arcH2 = rings[wallRow][q*3 + 2];

      // Diamond edge vertices: get from diamond grid
      // Diamond grid corners: [0][0]=dC[0], [0][3]=dC[1], [3][0]=dC[3], [3][3]=dC[2]
      // Diamond bottom (row 0): dC[0] → dC[1] side
      // We need the diamond edge that corresponds to this quarter.
      // Quarter q uses dC[q] → dC[qn] as its bottom.
      // Get the 2 interior diamond edge vertices:
      const de1 = Vlerp(dC[q], dC[qn], 1/3);
      const de2 = Vlerp(dC[q], dC[qn], 2/3);

      const grid: CageVertex[][] = [
        // Row 0: diamond edge
        [dC[q], de1, de2, dC[qn]],
        // Row 1: interpolated
        [radialVerts[q][1], Vlerp(de1, arcH1, 1/3), Vlerp(de2, arcH2, 1/3), radialVerts[qn][1]],
        // Row 2: interpolated
        [radialVerts[q][2], Vlerp(de1, arcH1, 2/3), Vlerp(de2, arcH2, 2/3), radialVerts[qn][2]],
        // Row 3: arc edge (SHARED with wall)
        [arcCorners[q], arcH1, arcH2, arcCorners[qn]],
      ];

      cage.patches.push(new NurbsPatch(grid));
    }
  }

  return cage;
}
