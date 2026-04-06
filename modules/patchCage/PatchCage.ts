/**
 * NURBS Patch Cage — watertight collection of bicubic NURBS surface patches.
 *
 * Each patch is a 4×4 control point grid (bicubic degree 3).
 * - 4 corner points lie ON the surface
 * - 12 interior/edge control points are off-surface handles
 * - Adjacent patches share edge control points (watertight)
 * - Default: Bézier (all weights = 1)
 * - Rational NURBS: non-uniform weights (for circles, cylinders)
 *
 * The subcage (displayed as 3×3 quads of the 4×4 grid) can be edited
 * by dragging vertices, edges, and faces.
 */

import {Vec3} from './patchCageTypes';
import {vadd, vsub, vscale, vlerp, vnormalize, vdist, vcross, vdot} from './vec3Math';

export interface NurbsPatch {
  id: number;
  /** 4×4 control point grid. control[row][col], row=V, col=U */
  control: Vec3[][];
  /** 4×4 weight grid (1.0 = Bézier, other = rational NURBS) */
  weights: number[][];
  /** Whether this patch uses rational NURBS */
  rational: boolean;
}

/**
 * Shared edge between two patches.
 * Points to 4 control points along the shared boundary.
 */
export interface SharedEdge {
  patchA: number;
  sideA: number;  // 0=bottom(v=0), 1=right(u=1), 2=top(v=1), 3=left(u=0)
  patchB: number;
  sideB: number;
  reversed: boolean; // true if patchB traverses the edge in reverse
}

export class PatchCage {
  patches: NurbsPatch[] = [];
  sharedEdges: SharedEdge[] = [];
  private nextId = 0;

  // =========================================================================
  // Construction
  // =========================================================================

  /**
   * Add a patch with a 4×4 control grid.
   * Weights default to 1.0 (Bézier).
   */
  addPatch(control: Vec3[][], weights?: number[][]): number {
    const id = this.nextId++;
    const w = weights || [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ];
    this.patches.push({id, control, weights: w, rational: !!weights});
    return id;
  }

  /**
   * Declare a shared edge between two patches.
   * The 4 control points along the shared boundary will be kept in sync.
   */
  addSharedEdge(patchA: number, sideA: number, patchB: number, sideB: number, reversed: boolean = false): void {
    this.sharedEdges.push({patchA, sideA, patchB, sideB, reversed});
    // Sync B's edge to A's edge
    this.syncSharedEdge(this.sharedEdges.length - 1);
  }

  // =========================================================================
  // Edge access — get/set the 4 control points along a patch boundary
  // =========================================================================

  getEdgePoints(patchId: number, side: number): Vec3[] {
    const c = this.patches[patchId].control;
    switch (side) {
      case 0: return [c[0][0], c[0][1], c[0][2], c[0][3]];           // bottom (v=0)
      case 1: return [c[0][3], c[1][3], c[2][3], c[3][3]];           // right (u=1)
      case 2: return [c[3][0], c[3][1], c[3][2], c[3][3]];           // top (v=1)
      case 3: return [c[0][0], c[1][0], c[2][0], c[3][0]];           // left (u=0)
      default: return [];
    }
  }

  setEdgePoints(patchId: number, side: number, pts: Vec3[]): void {
    // Mutate in place to preserve shared references
    const c = this.patches[patchId].control;
    const targets: Vec3[] = this.getEdgePoints(patchId, side);
    for (let i = 0; i < 4; i++) {
      targets[i][0] = pts[i][0];
      targets[i][1] = pts[i][1];
      targets[i][2] = pts[i][2];
    }
  }

  syncSharedEdge(edgeIdx: number): void {
    const se = this.sharedEdges[edgeIdx];
    const pts = this.getEdgePoints(se.patchA, se.sideA);
    const target = se.reversed ? [...pts].reverse() : pts;
    this.setEdgePoints(se.patchB, se.sideB, target);
  }

  syncAllSharedEdges(): void {
    for (let i = 0; i < this.sharedEdges.length; i++) {
      this.syncSharedEdge(i);
    }
  }

  // =========================================================================
  // Control point editing
  // =========================================================================

  setControlPoint(patchId: number, row: number, col: number, pos: Vec3): void {
    // Mutate in place — don't replace the array reference.
    // This preserves sharing: if another patch references the same Vec3,
    // both see the update.
    const cp = this.patches[patchId].control[row][col];
    cp[0] = pos[0];
    cp[1] = pos[1];
    cp[2] = pos[2];
  }

  setWeight(patchId: number, row: number, col: number, weight: number): void {
    this.patches[patchId].weights[row][col] = weight;
    this.patches[patchId].rational = true;
  }

  private syncEdgesForPoint(patchId: number, row: number, col: number): void {
    for (let i = 0; i < this.sharedEdges.length; i++) {
      const se = this.sharedEdges[i];
      if (se.patchA === patchId && this.isPointOnSide(row, col, se.sideA)) {
        this.syncSharedEdge(i);
      }
      if (se.patchB === patchId && this.isPointOnSide(row, col, se.sideB)) {
        // Reverse sync: B changed, update A
        const pts = this.getEdgePoints(se.patchB, se.sideB);
        const target = se.reversed ? [...pts].reverse() : pts;
        this.setEdgePoints(se.patchA, se.sideA, target);
      }
    }
  }

  private isPointOnSide(row: number, col: number, side: number): boolean {
    switch (side) {
      case 0: return row === 0;
      case 1: return col === 3;
      case 2: return row === 3;
      case 3: return col === 0;
      default: return false;
    }
  }

  // =========================================================================
  // Evaluation — bicubic Bézier / rational NURBS
  // =========================================================================

  evalPatch(patchId: number, u: number, v: number): Vec3 {
    const patch = this.patches[patchId];
    if (patch.rational) {
      return evalRationalBicubic(patch.control, patch.weights, u, v);
    }
    return evalBicubic(patch.control, u, v);
  }

  evalPatchNormal(patchId: number, u: number, v: number): Vec3 {
    const eps = 1e-5;
    const u0 = Math.max(0, u - eps), u1 = Math.min(1, u + eps);
    const v0 = Math.max(0, v - eps), v1 = Math.min(1, v + eps);
    const du = vsub(this.evalPatch(patchId, u1, v), this.evalPatch(patchId, u0, v));
    const dv = vsub(this.evalPatch(patchId, u, v1), this.evalPatch(patchId, u, v0));
    return vnormalize(vcross(du, dv));
  }

  // =========================================================================
  // Tessellation
  // =========================================================================

  tessellatePatch(patchId: number, resolution: number = 8): {
    positions: number[], normals: number[], indices: number[]
  } {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const n = resolution;

    for (let j = 0; j <= n; j++) {
      const v = j / n;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const p = this.evalPatch(patchId, u, v);
        const nm = this.evalPatchNormal(patchId, u, v);
        positions.push(p[0], p[1], p[2]);
        normals.push(nm[0], nm[1], nm[2]);
      }
    }

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    return {positions, normals, indices};
  }

  tessellateAll(resolution: number = 8): {
    vertices: Float32Array, normals: Float32Array, indices: Uint32Array,
    patchTriRanges: [number, number][]
  } {
    const allPos: number[] = [];
    const allNorm: number[] = [];
    const allIdx: number[] = [];
    const patchTriRanges: [number, number][] = [];
    let vertOffset = 0;
    let triIdx = 0;

    for (let pi = 0; pi < this.patches.length; pi++) {
      const tess = this.tessellatePatch(pi, resolution);
      const startTri = triIdx;
      for (const v of tess.positions) allPos.push(v);
      for (const v of tess.normals) allNorm.push(v);
      for (const i of tess.indices) allIdx.push(i + vertOffset);
      vertOffset += tess.positions.length / 3;
      triIdx += tess.indices.length / 3;
      patchTriRanges.push([startTri, triIdx]);
    }

    return {
      vertices: new Float32Array(allPos),
      normals: new Float32Array(allNorm),
      indices: new Uint32Array(allIdx),
      patchTriRanges,
    };
  }
}

// =========================================================================
// Bicubic Bézier evaluation
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt * mt * mt, 3 * mt * mt * t, 3 * mt * t * t, t * t * t];
}

function evalBicubic(control: Vec3[][], u: number, v: number): Vec3 {
  const bu = bernstein3(u);
  const bv = bernstein3(v);
  const result: Vec3 = [0, 0, 0];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const w = bu[i] * bv[j];
      result[0] += w * control[j][i][0];
      result[1] += w * control[j][i][1];
      result[2] += w * control[j][i][2];
    }
  }
  return result;
}

function evalRationalBicubic(control: Vec3[][], weights: number[][], u: number, v: number): Vec3 {
  const bu = bernstein3(u);
  const bv = bernstein3(v);
  let wx = 0, wy = 0, wz = 0, wsum = 0;
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const b = bu[i] * bv[j];
      const w = b * weights[j][i];
      wx += w * control[j][i][0];
      wy += w * control[j][i][1];
      wz += w * control[j][i][2];
      wsum += w;
    }
  }
  return wsum > 0 ? [wx / wsum, wy / wsum, wz / wsum] : [0, 0, 0];
}
