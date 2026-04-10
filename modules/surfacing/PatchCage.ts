/**
 * NURBS Patch Cage with explicit shared topology.
 *
 * Watertightness is enforced by object identity:
 * - CageVertex instances are shared between patches
 * - CageEdge instances are shared between patches
 * - No synchronization, no copying, no duplication
 * - If two patches share a boundary, they literally reference the same CageVertex objects
 */

import {Vec3} from './patchCageTypes';
import {normalize as vnormalize, sub as vsub, cross as vcross} from 'math/vec';
import {makeGrid as _makeGrid} from './patchCageHelpers';

// Lazy imports to avoid circular dependencies
import * as _arcOps from './ops/arc/arc.command';
import * as _contOps from './ops/continuity/continuity.command';
import * as _mirrorOps from './ops/mirror/mirror.command';
import * as _splitOps from './ops/split/split.command';
import * as _fillOps from './ops/fillHole/fillHole.command';
import * as _pushPullOps from './ops/pushPull/pushPull.command';
import * as _extrudeOps from './ops/extrude/extrude.command';
import * as _subdivideOps from './ops/subdivide/subdivide.command';

// Re-export for backward compatibility
export const makeGrid = _makeGrid;

// =========================================================================
// Topology primitives — shared by identity
// =========================================================================

export class CageVertex {
  position: Vec3;
  constructor(x: number, y: number, z: number) {
    this.position = [x, y, z];
  }
  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
  }
}

export type ArcMode = 'approximate' | 'rational';

export interface ArcConstraint {
  /** The 4 CageVertex on the constrained edge */
  vertices: [CageVertex, CageVertex, CageVertex, CageVertex];
  radius: number;
  /** Sweep angle in degrees */
  angle: number;
  /** Normal of the arc plane */
  planeNormal: Vec3;
  /** Center of the arc circle */
  center: Vec3;
  /** 'approximate' = cubic Bézier (no weights), 'rational' = exact with weights */
  mode: ArcMode;
  /** If rational: which patch + which side, to set weights */
  patchSide?: {patchIdx: number, side: number};
}

export interface MirrorConstraint {
  /** The source patch whose CPs drive the mirror */
  sourcePatchIdx: number;
  /** The mirrored (read-only) patch */
  mirrorPatchIdx: number;
  /** Reflection plane: a point on the plane */
  planePoint: Vec3;
  /** Reflection plane: unit normal */
  planeNormal: Vec3;
  /** Pairs mapping source CPs to their mirror CPs (excludes shared edge CPs) */
  cpPairs: {source: CageVertex, mirror: CageVertex}[];
}

export interface SerializedPatchCage {
  vertices: Vec3[];
  patches: {
    grid: number[][];
    weights: number[][];
    rational: boolean;
  }[];
  arcConstraints: {
    vertexIndices: [number, number, number, number];
    radius: number;
    angle: number;
    planeNormal: Vec3;
    center: Vec3;
    mode: ArcMode;
    patchSide?: {patchIdx: number, side: number};
  }[];
  mirrorConstraints?: {
    sourcePatchIdx: number;
    mirrorPatchIdx: number;
    planePoint: Vec3;
    planeNormal: Vec3;
    cpPairs: {sourceVertexIdx: number, mirrorVertexIdx: number}[];
  }[];
  groups?: {name: string, patchIndices: number[]}[];
}

/**
 * A cage edge: 4 CageVertex references forming a cubic Bézier curve.
 * Shared between adjacent patches.
 */
export class CageEdge {
  v0: CageVertex;  // start (on surface)
  v1: CageVertex;  // handle near start
  v2: CageVertex;  // handle near end
  v3: CageVertex;  // end (on surface)

  constructor(v0: CageVertex, v1: CageVertex, v2: CageVertex, v3: CageVertex) {
    this.v0 = v0; this.v1 = v1; this.v2 = v2; this.v3 = v3;
  }

  eval(t: number): Vec3 {
    const mt = 1 - t;
    const p0 = this.v0.position, p1 = this.v1.position, p2 = this.v2.position, p3 = this.v3.position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }

  /** Get the 4 vertices as an array */
  vertices(): [CageVertex, CageVertex, CageVertex, CageVertex] {
    return [this.v0, this.v1, this.v2, this.v3];
  }

  /** Get reversed (same vertices, reversed order) */
  reversed(): [CageVertex, CageVertex, CageVertex, CageVertex] {
    return [this.v3, this.v2, this.v1, this.v0];
  }
}

/**
 * A patch face: references a 4×4 grid of CageVertex instances.
 * Boundary vertices are shared with adjacent patches via CageEdge.
 */
export class NurbsPatch {
  /** 4×4 grid of CageVertex. grid[row][col], row=V direction, col=U direction */
  grid: CageVertex[][];
  /** 4×4 weights (1.0 = Bézier, other = rational NURBS) */
  weights: number[][];
  rational: boolean;

  constructor(grid: CageVertex[][], weights?: number[][]) {
    this.grid = grid;
    this.weights = weights || [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]];
    this.rational = !!weights;
  }

  eval(u: number, v: number): Vec3 {
    const bu = bernstein3(u), bv = bernstein3(v);
    if (this.rational) {
      let wx = 0, wy = 0, wz = 0, wsum = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const w = bu[i] * bv[j] * this.weights[j][i];
        const p = this.grid[j][i].position;
        wx += w * p[0]; wy += w * p[1]; wz += w * p[2]; wsum += w;
      }
      return wsum > 0 ? [wx/wsum, wy/wsum, wz/wsum] : [0,0,0];
    }
    const r: Vec3 = [0,0,0];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const w = bu[i] * bv[j];
      const p = this.grid[j][i].position;
      r[0] += w*p[0]; r[1] += w*p[1]; r[2] += w*p[2];
    }
    return r;
  }

  normal(u: number, v: number): Vec3 {
    const eps = 1e-5;
    const du = vsub(this.eval(Math.min(1,u+eps), v), this.eval(Math.max(0,u-eps), v));
    const dv = vsub(this.eval(u, Math.min(1,v+eps)), this.eval(u, Math.max(0,v-eps)));
    return vnormalize(vcross(du, dv));
  }

  /** Get edge as array of 4 CageVertex. side: 0=bottom, 1=right, 2=top, 3=left */
  getEdgeVertices(side: number): [CageVertex, CageVertex, CageVertex, CageVertex] {
    const g = this.grid;
    switch (side) {
      case 0: return [g[0][0], g[0][1], g[0][2], g[0][3]];
      case 1: return [g[0][3], g[1][3], g[2][3], g[3][3]];
      case 2: return [g[3][0], g[3][1], g[3][2], g[3][3]];
      case 3: return [g[0][0], g[1][0], g[2][0], g[3][0]];
      default: return [g[0][0], g[0][1], g[0][2], g[0][3]];
    }
  }
}

// =========================================================================
// Patch Cage — the container
// =========================================================================

export interface PatchGroup {
  name: string;
  patchIndices: number[];
}

export class PatchCage {
  patches: NurbsPatch[] = [];
  arcConstraints: ArcConstraint[] = [];
  mirrorConstraints: MirrorConstraint[] = [];
  groups: PatchGroup[] = [];

  /** Create a named group containing the given patch indices */
  createGroup(name: string, patchIndices: number[]): PatchGroup {
    const group: PatchGroup = {name, patchIndices: [...patchIndices]};
    this.groups.push(group);
    return group;
  }

  /** Find the group that contains a given patch index */
  findGroupOfPatch(patchIdx: number): PatchGroup | null {
    for (const g of this.groups) {
      if (g.patchIndices.includes(patchIdx)) return g;
    }
    return null;
  }

  /** Notify groups that a patch was replaced by splice (old index removed, new indices inserted) */
  notifySplice(oldIdx: number, removedCount: number, insertedCount: number): void {
    for (const g of this.groups) {
      const newIndices: number[] = [];
      for (const idx of g.patchIndices) {
        if (idx >= oldIdx && idx < oldIdx + removedCount) {
          // This patch was removed — add the replacement indices
          for (let j = 0; j < insertedCount; j++) {
            newIndices.push(oldIdx + j);
          }
        } else if (idx >= oldIdx + removedCount) {
          // Shift indices after the splice point
          newIndices.push(idx - removedCount + insertedCount);
        } else {
          newIndices.push(idx);
        }
      }
      g.patchIndices = newIndices;
    }
  }

  /** Notify groups that patches were pushed (appended) and should join a specific group */
  notifyPush(count: number, targetGroup: PatchGroup | null): void {
    if (!targetGroup) return;
    const startIdx = this.patches.length - count;
    for (let i = 0; i < count; i++) {
      targetGroup.patchIndices.push(startIdx + i);
    }
  }

  /** Registered constraint enforcers called on every vertex move */
  private constraintEnforcers: ((cage: PatchCage, v: CageVertex) => void)[] = [];

  registerConstraintEnforcer(fn: (cage: PatchCage, v: CageVertex) => void): void {
    this.constraintEnforcers.push(fn);
  }

  /** Move a vertex — all patches sharing it update automatically */
  moveVertex(v: CageVertex, x: number, y: number, z: number): void {
    v.set(x, y, z);
    // Run registered enforcers first
    for (const enforce of this.constraintEnforcers) enforce(this, v);
    // Built-in constraint enforcement (arc + mirror)
    _arcOps.enforceArcConstraints(this, v);
    _mirrorOps.enforceMirrorConstraints(this, v);
  }

  // =========================================================================
  // Backward-compatible delegates to ops/ modules
  // These will be removed once patchCageView is refactored to use ops directly
  // =========================================================================

  constrainEdgeToArc(patchIdx: number, side: number, radius: number, angle: number, planeNormal: Vec3, mode: ArcMode = 'approximate'): ArcConstraint {
    return _arcOps.constrainEdgeToArc(this, patchIdx, side, radius, angle, planeNormal, mode);
  }
  applyArcConstraint(c: ArcConstraint): void { _arcOps.applyArcConstraint(this, c); }
  enforceArcConstraints(v: CageVertex): void { _arcOps.enforceArcConstraints(this, v); }
  removeArcConstraint(constraint: ArcConstraint): void { _arcOps.removeArcConstraint(this, constraint); }
  applyG1(patchIdx: number, side: number): boolean { return _contOps.applyG1(this, patchIdx, side); }
  applyG1AllSides(patchIdx: number): void { _contOps.applyG1AllSides(this, patchIdx); }
  applyG2(patchIdx: number, side: number): boolean { return _contOps.applyG2(this, patchIdx, side); }
  mirrorAcrossEdge(patchIdx: number, side: number): number[] { return _mirrorOps.mirrorAcrossEdge(this, patchIdx, side); }
  enforceMirrorConstraints(v: CageVertex): void { _mirrorOps.enforceMirrorConstraints(this, v); }
  enforceAllMirrorConstraints(): void { _mirrorOps.enforceAllMirrorConstraints(this); }
  isMirrorTarget(v: CageVertex): boolean { return _mirrorOps.isMirrorTarget(this, v); }
  removeMirrorConstraint(mc: MirrorConstraint, deletePatch: boolean = true): void { _mirrorOps.removeMirrorConstraint(this, mc, deletePatch); }
  splitIsoline(patchIdx: number, direction: 'u' | 'v', t: number): void { _splitOps.splitIsoline(this, patchIdx, direction, t); }
  computeIsolinePropagation(patchIdx: number, direction: 'u' | 'v', t: number) { return _splitOps.computeIsolinePropagation(this, patchIdx, direction, t); }
  tessellateIsoline(patchIdx: number, direction: 'u' | 'v', t: number, segments: number = 24): Vec3[] { return _splitOps.tessellateIsoline(this, patchIdx, direction, t, segments); }
  traceHole(startPatchIdx: number, startSide: number) { return _fillOps.traceHole(this, startPatchIdx, startSide); }
  fillHole(loop: {patchIdx: number, side: number, verts: [CageVertex, CageVertex, CageVertex, CageVertex]}[]): boolean { return _fillOps.fillHole(this, loop); }
  pushPullPatch(patchIdx: number, distance: number): void { _pushPullOps.pushPullPatch(this, patchIdx, distance); }
  extrudePatch(patchIdx: number, distance: number): void { _extrudeOps.extrudePatch(this, patchIdx, distance); }
  subdividePatch(patchIdx: number): void { _subdivideOps.subdividePatch(this, patchIdx); }

  // =========================================================================
  // Core: Topology Queries
  // =========================================================================

  /** Get all unique CageVertex instances across all patches */
  allVertices(): CageVertex[] {
    const seen = new Set<CageVertex>();
    for (const p of this.patches) {
      for (const row of p.grid) {
        for (const v of row) seen.add(v);
      }
    }
    return Array.from(seen);
  }

  /**
   * Find which patches share an edge with a given patch.
   * Returns {side, otherPatch, otherSide, reversed} for each shared edge.
   */
  findAdjacentPatches(patchIdx: number): {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] {
    const patch = this.patches[patchIdx];
    const result: {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] = [];

    for (let side = 0; side < 4; side++) {
      const edge = patch.getEdgeVertices(side);
      for (let oi = 0; oi < this.patches.length; oi++) {
        if (oi === patchIdx) continue;
        const other = this.patches[oi];
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeVertices(os);
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: false});
          }
          if (edge[0] === otherEdge[3] && edge[1] === otherEdge[2] &&
              edge[2] === otherEdge[1] && edge[3] === otherEdge[0]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: true});
          }
        }
      }
    }
    return result;
  }

  /**
   * Get the interior row/column of control points adjacent to a side.
   * depth=1 → first interior row, depth=2 → second interior row.
   */
  getInteriorRow(patchIdx: number, side: number, depth: number): CageVertex[] {
    const g = this.patches[patchIdx].grid;
    switch (side) {
      case 0: return [g[depth][0], g[depth][1], g[depth][2], g[depth][3]];
      case 1: return [g[0][3 - depth], g[1][3 - depth], g[2][3 - depth], g[3][3 - depth]];
      case 2: return [g[3 - depth][0], g[3 - depth][1], g[3 - depth][2], g[3 - depth][3]];
      case 3: return [g[0][depth], g[1][depth], g[2][depth], g[3][depth]];
      default: return [];
    }
  }

  /**
   * Find all free edges (edges with a patch on only one side).
   */
  findFreeEdges(): {patchIdx: number, side: number, verts: [CageVertex, CageVertex, CageVertex, CageVertex]}[] {
    const free: {patchIdx: number, side: number, verts: [CageVertex, CageVertex, CageVertex, CageVertex]}[] = [];
    for (let pi = 0; pi < this.patches.length; pi++) {
      const adj = this.findAdjacentPatches(pi);
      const sharedSides = new Set(adj.map(a => a.side));
      for (let side = 0; side < 4; side++) {
        if (!sharedSides.has(side)) {
          free.push({patchIdx: pi, side, verts: this.patches[pi].getEdgeVertices(side)});
        }
      }
    }
    return free;
  }

  // =========================================================================
  // Tessellation
  // =========================================================================

  tessellatePatch(patchIdx: number, resolution: number = 8): {
    positions: number[], normals: number[], indices: number[]
  } {
    const patch = this.patches[patchIdx];
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    const n = resolution;

    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const p = patch.eval(i/n, j/n);
      const nm = patch.normal(i/n, j/n);
      positions.push(p[0], p[1], p[2]);
      normals.push(nm[0], nm[1], nm[2]);
    }

    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j*(n+1)+i, b = a+1, c = a+(n+1), d = c+1;
      indices.push(a, b, d, a, d, c);
    }

    return {positions, normals, indices};
  }

  tessellateAll(resolution: number = 8): {
    vertices: Float32Array, normals: Float32Array, indices: Uint32Array,
    patchTriRanges: [number, number][]
  } {
    const allPos: number[] = [], allNorm: number[] = [], allIdx: number[] = [];
    const ranges: [number, number][] = [];
    let vOff = 0, tIdx = 0;

    for (let pi = 0; pi < this.patches.length; pi++) {
      const t = this.tessellatePatch(pi, resolution);
      const start = tIdx;
      for (const v of t.positions) allPos.push(v);
      for (const v of t.normals) allNorm.push(v);
      for (const i of t.indices) allIdx.push(i + vOff);
      vOff += t.positions.length / 3;
      tIdx += t.indices.length / 3;
      ranges.push([start, tIdx]);
    }

    return {
      vertices: new Float32Array(allPos), normals: new Float32Array(allNorm),
      indices: new Uint32Array(allIdx), patchTriRanges: ranges,
    };
  }

  // =========================================================================
  // Serialization / Deserialization
  // =========================================================================

  serialize(): SerializedPatchCage {
    const vertexMap = new Map<CageVertex, number>();
    const vertices: Vec3[] = [];

    for (const p of this.patches) {
      for (const row of p.grid) {
        for (const v of row) {
          if (!vertexMap.has(v)) {
            vertexMap.set(v, vertices.length);
            vertices.push([...v.position] as Vec3);
          }
        }
      }
    }

    const patches = this.patches.map(p => ({
      grid: p.grid.map(row => row.map(v => vertexMap.get(v)!)),
      weights: p.weights.map(row => [...row]),
      rational: p.rational,
    }));

    const arcConstraints = this.arcConstraints.map(c => ({
      vertexIndices: c.vertices.map(v => vertexMap.get(v)!) as [number, number, number, number],
      radius: c.radius,
      angle: c.angle,
      planeNormal: [...c.planeNormal] as Vec3,
      center: [...c.center] as Vec3,
      mode: c.mode,
      patchSide: c.patchSide ? {...c.patchSide} : undefined,
    }));

    const mirrorConstraints = this.mirrorConstraints.map(mc => ({
      sourcePatchIdx: mc.sourcePatchIdx,
      mirrorPatchIdx: mc.mirrorPatchIdx,
      planePoint: [...mc.planePoint] as Vec3,
      planeNormal: [...mc.planeNormal] as Vec3,
      cpPairs: mc.cpPairs.map(pair => ({
        sourceVertexIdx: vertexMap.get(pair.source)!,
        mirrorVertexIdx: vertexMap.get(pair.mirror)!,
      })),
    }));

    const groups = this.groups.map(g => ({name: g.name, patchIndices: [...g.patchIndices]}));

    return {vertices, patches, arcConstraints, mirrorConstraints, groups};
  }

  static deserialize(data: SerializedPatchCage): PatchCage {
    const cage = new PatchCage();
    const verts = data.vertices.map(p => new CageVertex(p[0], p[1], p[2]));

    for (const pd of data.patches) {
      const grid = pd.grid.map(row => row.map(idx => verts[idx]));
      const patch = new NurbsPatch(grid, pd.weights.map(row => [...row]));
      patch.rational = pd.rational;
      cage.patches.push(patch);
    }

    for (const cd of data.arcConstraints) {
      cage.arcConstraints.push({
        vertices: cd.vertexIndices.map(i => verts[i]) as [CageVertex, CageVertex, CageVertex, CageVertex],
        radius: cd.radius,
        angle: cd.angle,
        planeNormal: [...cd.planeNormal] as Vec3,
        center: [...cd.center] as Vec3,
        mode: cd.mode,
        patchSide: cd.patchSide ? {...cd.patchSide} : undefined,
      });
    }

    if (data.mirrorConstraints) {
      for (const md of data.mirrorConstraints) {
        cage.mirrorConstraints.push({
          sourcePatchIdx: md.sourcePatchIdx,
          mirrorPatchIdx: md.mirrorPatchIdx,
          planePoint: [...md.planePoint] as Vec3,
          planeNormal: [...md.planeNormal] as Vec3,
          cpPairs: md.cpPairs.map(pair => ({
            source: verts[pair.sourceVertexIdx],
            mirror: verts[pair.mirrorVertexIdx],
          })),
        });
      }
    }

    if (data.groups) {
      for (const gd of data.groups) {
        cage.createGroup(gd.name, gd.patchIndices);
      }
    }

    return cage;
  }
}

// =========================================================================
// Helpers
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt*mt*mt, 3*mt*mt*t, 3*mt*t*t, t*t*t];
}
