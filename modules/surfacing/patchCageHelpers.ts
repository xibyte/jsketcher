/**
 * Shared helpers used by multiple patchCage operations.
 */

import {CageVertex} from './models/Scene/Scene.entity';
import {Vec3} from './patchCageTypes';
import {add as vadd, mul as vscale, lerp as vlerp} from 'math/vec';

export interface BoundarySplitResult {
  leftH: [CageVertex, CageVertex];
  mid: CageVertex;
  rightH: [CageVertex, CageVertex];
}

/**
 * De Casteljau split of 4 cubic Bézier control points at parameter t.
 * Returns: left half (2 interior CageVertex), midpoint Vec3, right half (2 interior CageVertex).
 * The original endpoints are reused (shared by identity).
 */
export function splitBezierRow(p0: CageVertex, p1: CageVertex, p2: CageVertex, p3: CageVertex, t: number): {
  left: [CageVertex, CageVertex],
  mid: Vec3,
  right: [CageVertex, CageVertex]
} {
  const a = vlerp(p0.position, p1.position, t);
  const b = vlerp(p1.position, p2.position, t);
  const c = vlerp(p2.position, p3.position, t);
  const d = vlerp(a, b, t);
  const e = vlerp(b, c, t);
  const mid = vlerp(d, e, t);

  return {
    left: [new CageVertex(a[0], a[1], a[2]), new CageVertex(d[0], d[1], d[2])],
    mid,
    right: [new CageVertex(e[0], e[1], e[2]), new CageVertex(c[0], c[1], c[2])],
  };
}

export function cloneWeights(w: number[][]): number[][] {
  return w.map(row => [...row]);
}

function lerpVert(a: CageVertex, b: CageVertex, t: number): CageVertex {
  const p = vlerp(a.position, b.position, t);
  return new CageVertex(p[0], p[1], p[2]);
}

/**
 * Create a 4×4 CageVertex grid. Interior vertices are new instances.
 * Boundary vertices can be supplied to share with adjacent patches.
 */
export function makeGrid(
  corners: [CageVertex, CageVertex, CageVertex, CageVertex], // [c00, c10, c01, c11]
  edges?: {
    bottom?: [CageVertex, CageVertex, CageVertex, CageVertex], // row 0: c00, ?, ?, c10
    right?: [CageVertex, CageVertex, CageVertex, CageVertex],  // col 3: c10, ?, ?, c11
    top?: [CageVertex, CageVertex, CageVertex, CageVertex],    // row 3: c01, ?, ?, c11
    left?: [CageVertex, CageVertex, CageVertex, CageVertex],   // col 0: c00, ?, ?, c01
  }
): CageVertex[][] {
  const [c00, c10, c01, c11] = corners;
  const grid: CageVertex[][] = [[], [], [], []];

  // Corners
  grid[0][0] = c00; grid[0][3] = c10;
  grid[3][0] = c01; grid[3][3] = c11;

  // Bottom edge (row 0)
  if (edges?.bottom) {
    grid[0][1] = edges.bottom[1];
    grid[0][2] = edges.bottom[2];
  } else {
    grid[0][1] = lerpVert(c00, c10, 1/3);
    grid[0][2] = lerpVert(c00, c10, 2/3);
  }

  // Top edge (row 3)
  if (edges?.top) {
    grid[3][1] = edges.top[1];
    grid[3][2] = edges.top[2];
  } else {
    grid[3][1] = lerpVert(c01, c11, 1/3);
    grid[3][2] = lerpVert(c01, c11, 2/3);
  }

  // Left edge (col 0)
  if (edges?.left) {
    grid[1][0] = edges.left[1];
    grid[2][0] = edges.left[2];
  } else {
    grid[1][0] = lerpVert(c00, c01, 1/3);
    grid[2][0] = lerpVert(c00, c01, 2/3);
  }

  // Right edge (col 3)
  if (edges?.right) {
    grid[1][3] = edges.right[1];
    grid[2][3] = edges.right[2];
  } else {
    grid[1][3] = lerpVert(c10, c11, 1/3);
    grid[2][3] = lerpVert(c10, c11, 2/3);
  }

  // Interior: 4 vertices via bilinear interpolation
  for (let row = 1; row <= 2; row++) {
    const v = row / 3;
    for (let col = 1; col <= 2; col++) {
      if (grid[row][col]) continue; // already set by edge
      const u = col / 3;
      const p = vadd(
        vadd(vscale(c00.position, (1-u)*(1-v)), vscale(c10.position, u*(1-v))),
        vadd(vscale(c01.position, (1-u)*v), vscale(c11.position, u*v))
      );
      grid[row][col] = new CageVertex(p[0], p[1], p[2]);
    }
  }

  return grid;
}
