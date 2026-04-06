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
import {vadd, vsub, vscale, vlerp, vnormalize, vdist, vcross, vdot} from './vec3Math';

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

export class PatchCage {
  patches: NurbsPatch[] = [];
  arcConstraints: ArcConstraint[] = [];

  /** Move a vertex — all patches sharing it update automatically */
  moveVertex(v: CageVertex, x: number, y: number, z: number): void {
    v.set(x, y, z);
    // Re-enforce any arc constraints that involve this vertex
    this.enforceArcConstraints(v);
  }

  // =========================================================================
  // Arc Constraints
  // =========================================================================

  /**
   * Constrain an edge to a circular arc.
   *
   * @param patchIdx Patch containing the edge
   * @param side Which side (0=bottom, 1=right, 2=top, 3=left)
   * @param radius Arc radius
   * @param angle Sweep angle in degrees
   * @param planeNormal Normal of the arc plane
   * @param mode 'approximate' (cubic Bézier) or 'rational' (exact with weights)
   */
  constrainEdgeToArc(
    patchIdx: number, side: number,
    radius: number, angle: number,
    planeNormal: Vec3, mode: ArcMode = 'approximate'
  ): ArcConstraint {
    const verts = this.patches[patchIdx].getEdgeVertices(side);

    // Compute arc center from endpoints, radius, and plane normal
    const p0 = verts[0].position;
    const p3 = verts[3].position;
    const center = computeArcCenter(p0, p3, radius, angle, planeNormal);

    const constraint: ArcConstraint = {
      vertices: verts,
      radius, angle, planeNormal, center, mode,
      patchSide: {patchIdx, side},
    };

    this.arcConstraints.push(constraint);
    this.applyArcConstraint(constraint);
    return constraint;
  }

  /**
   * Apply an arc constraint: reposition interior control points.
   * For rational mode, also set weights on the patch.
   */
  applyArcConstraint(c: ArcConstraint): void {
    const [v0, v1, v2, v3] = c.vertices;
    const p0 = v0.position, p3 = v3.position;
    const angleRad = (c.angle * Math.PI) / 180;

    // k = handle distance ratio for cubic Bézier circle approximation
    const k = (4 / 3) * Math.tan(angleRad / 4);

    // Radial directions from center to endpoints
    const r0 = vnormalize(vsub(p0, c.center));
    const r3 = vnormalize(vsub(p3, c.center));

    // Tangent at each endpoint = perpendicular to radius, in the arc plane
    // tangent at p0: rotate r0 by 90° in the arc plane (toward p3)
    const t0 = vnormalize(vcross(c.planeNormal, r0));
    // tangent at p3: rotate r3 by -90° in the arc plane (toward p0)
    const t3 = vnormalize(vcross(c.planeNormal, r3));

    // Ensure tangent directions point along the arc (from p0 toward p3)
    const chord = vsub(p3, p0);
    if (vdot(t0, chord) < 0) { t0[0] = -t0[0]; t0[1] = -t0[1]; t0[2] = -t0[2]; }
    if (vdot(t3, chord) > 0) { t3[0] = -t3[0]; t3[1] = -t3[1]; t3[2] = -t3[2]; }

    const handleLen = k * c.radius;

    v1.set(
      p0[0] + t0[0] * handleLen,
      p0[1] + t0[1] * handleLen,
      p0[2] + t0[2] * handleLen
    );
    v2.set(
      p3[0] + t3[0] * handleLen,
      p3[1] + t3[1] * handleLen,
      p3[2] + t3[2] * handleLen
    );

    if (c.mode === 'approximate') {
      if (c.patchSide) {
        this.setEdgeWeights(c.patchSide.patchIdx, c.patchSide.side, [1, 1, 1, 1]);
      }
    } else {
      // Rational: set weights for exact arc
      const wMid = Math.cos(angleRad / 4);
      if (c.patchSide) {
        this.setEdgeWeights(c.patchSide.patchIdx, c.patchSide.side, [1, wMid, wMid, 1]);
        this.patches[c.patchSide.patchIdx].rational = true;
      }
    }
  }

  /** Re-enforce arc constraints that involve a given vertex */
  enforceArcConstraints(v: CageVertex): void {
    for (const c of this.arcConstraints) {
      // Only re-apply if an endpoint moved (interior points are computed)
      if (c.vertices[0] === v || c.vertices[3] === v) {
        // Recompute center from new endpoint positions
        c.center = computeArcCenter(
          c.vertices[0].position, c.vertices[3].position,
          c.radius, c.angle, c.planeNormal
        );
        this.applyArcConstraint(c);
      }
    }
  }

  /** Set weights on 4 control points along a patch edge */
  private setEdgeWeights(patchIdx: number, side: number, weights: [number, number, number, number]): void {
    const w = this.patches[patchIdx].weights;
    switch (side) {
      case 0: w[0][0]=weights[0]; w[0][1]=weights[1]; w[0][2]=weights[2]; w[0][3]=weights[3]; break;
      case 1: w[0][3]=weights[0]; w[1][3]=weights[1]; w[2][3]=weights[2]; w[3][3]=weights[3]; break;
      case 2: w[3][0]=weights[0]; w[3][1]=weights[1]; w[3][2]=weights[2]; w[3][3]=weights[3]; break;
      case 3: w[0][0]=weights[0]; w[1][0]=weights[1]; w[2][0]=weights[2]; w[3][0]=weights[3]; break;
    }
  }

  /** Remove an arc constraint */
  removeArcConstraint(constraint: ArcConstraint): void {
    const idx = this.arcConstraints.indexOf(constraint);
    if (idx >= 0) {
      this.arcConstraints.splice(idx, 1);
      // Reset weights if rational
      if (constraint.mode === 'rational' && constraint.patchSide) {
        this.setEdgeWeights(constraint.patchSide.patchIdx, constraint.patchSide.side, [1, 1, 1, 1]);
        // Check if patch still has any non-1 weights
        const p = this.patches[constraint.patchSide.patchIdx];
        p.rational = p.weights.some(row => row.some(w => w !== 1));
      }
    }
  }

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
      // Find another patch that shares these 4 vertices on one of its sides
      for (let oi = 0; oi < this.patches.length; oi++) {
        if (oi === patchIdx) continue;
        const other = this.patches[oi];
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeVertices(os);
          // Check forward match
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: false});
          }
          // Check reversed match
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
   * Split along an isoline, propagating across ALL connected patches.
   *
   * Splitting patch P in U at t creates a new column cutting through P.
   * This new column intersects the top (side 2) and bottom (side 0) edges.
   * Any patch sharing those edges must also be split at the corresponding point.
   * This propagation continues until wrapping around or hitting a boundary.
   *
   * @param patchIdx Starting patch index
   * @param direction 'u' or 'v'
   * @param t Parameter value (0..1)
   */
  splitIsoline(patchIdx: number, direction: 'u' | 'v', t: number): void {
    const toSplit: {idx: number, dir: 'u' | 'v', t: number}[] = [];
    const visited = new Set<number>();

    const queue: {idx: number, dir: 'u' | 'v', t: number}[] = [{idx: patchIdx, dir: direction, t}];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur.idx)) continue;
      visited.add(cur.idx);
      toSplit.push(cur);

      // Splitting in U creates a cut across side 0 (bottom) and side 2 (top).
      // Splitting in V creates a cut across side 3 (left) and side 1 (right).
      // Patches sharing those cut edges need to be split too.
      const cutSides = cur.dir === 'u' ? [0, 2] : [3, 1];

      const adj = this.findAdjacentPatches(cur.idx);
      for (const a of adj) {
        if (visited.has(a.otherIdx)) continue;
        if (!cutSides.includes(a.side)) continue;

        // Determine split direction and parameter in the neighbor.
        // The cut enters the neighbor through otherSide.
        // If otherSide is 0 or 2 (horizontal), the cut continues in U direction.
        // If otherSide is 1 or 3 (vertical), the cut continues in V direction.
        const otherIsHorizontal = a.otherSide === 0 || a.otherSide === 2;
        const adjDir: 'u' | 'v' = otherIsHorizontal ? 'u' : 'v';
        const adjT = a.reversed ? (1 - cur.t) : cur.t;

        queue.push({idx: a.otherIdx, dir: adjDir, t: adjT});
      }
    }

    // Pre-compute split vertices for each cut edge so they're shared.
    // A cut edge is where the isoline crosses a patch boundary.
    // Two adjacent patches that both get split share the SAME new vertex on their shared edge.

    // For each patch being split, compute the 4 new midpoint CageVertex on its cut edges.
    // Key: use the SAME CageVertex when two patches share a cut edge.

    // Map: shared edge vertex pair → new split CageVertex
    // When the isoline crosses an edge (4 CageVertex), the split point is at parameter t on that edge.
    // Two patches sharing that edge need the SAME split vertex.
    const edgeSplitVertexMap = new Map<CageVertex, CageVertex>();

    function getOrCreateSplitVertex(edgeStart: CageVertex, edgeEnd: CageVertex, t: number): CageVertex {
      // The split vertex is on the edge from edgeStart to edgeEnd.
      // Use edgeStart as key (both patches see the same edgeStart for forward-matched edges).
      // For reversed edges, the other patch sees edgeEnd as its start — handle both.
      let key = edgeStart;
      if (edgeSplitVertexMap.has(key)) return edgeSplitVertexMap.get(key)!;
      key = edgeEnd;
      if (edgeSplitVertexMap.has(key)) return edgeSplitVertexMap.get(key)!;

      const p = vlerp(edgeStart.position, edgeEnd.position, t);
      const v = new CageVertex(p[0], p[1], p[2]);
      edgeSplitVertexMap.set(edgeStart, v);
      edgeSplitVertexMap.set(edgeEnd, v);
      return v;
    }

    // Split in reverse index order so splice doesn't invalidate earlier indices
    toSplit.sort((a, b) => b.idx - a.idx);
    for (const s of toSplit) {
      this.splitSinglePatchShared(s.idx, s.dir, s.t, getOrCreateSplitVertex);
    }
  }

  /**
   * Split a single patch using shared vertex factory for cut-edge vertices.
   */
  private splitSinglePatchShared(
    patchIdx: number, direction: 'u' | 'v', t: number,
    getSharedVertex: (a: CageVertex, b: CageVertex, t: number) => CageVertex
  ): void {
    const patch = this.patches[patchIdx];
    const g = patch.grid;

    if (direction === 'u') {
      const leftGrid: CageVertex[][] = [];
      const rightGrid: CageVertex[][] = [];

      for (let row = 0; row < 4; row++) {
        const {left, mid, right} = splitBezierRow(g[row][0], g[row][1], g[row][2], g[row][3], t);

        // For boundary rows (0 and 3), the mid vertex is on a shared edge.
        // Use the shared vertex factory so adjacent patches get the SAME vertex.
        let midV: CageVertex;
        if (row === 0 || row === 3) {
          midV = getSharedVertex(g[row][0], g[row][3], t);
        } else {
          // Interior row: new vertex, not shared
          midV = new CageVertex(mid[0], mid[1], mid[2]);
        }

        leftGrid.push([g[row][0], left[0], left[1], midV]);
        rightGrid.push([midV, right[0], right[1], g[row][3]]);
      }

      this.patches.splice(patchIdx, 1,
        new NurbsPatch(leftGrid, cloneWeights(patch.weights)),
        new NurbsPatch(rightGrid, cloneWeights(patch.weights))
      );
    } else {
      const bottomGrid: CageVertex[][] = [[], [], [], []];
      const topGrid: CageVertex[][] = [[], [], [], []];

      for (let col = 0; col < 4; col++) {
        const {left, mid, right} = splitBezierRow(g[0][col], g[1][col], g[2][col], g[3][col], t);

        // For boundary columns (0 and 3), the mid vertex is on a shared edge.
        let midV: CageVertex;
        if (col === 0 || col === 3) {
          midV = getSharedVertex(g[0][col], g[3][col], t);
        } else {
          midV = new CageVertex(mid[0], mid[1], mid[2]);
        }

        bottomGrid[0][col] = g[0][col];
        bottomGrid[1][col] = left[0];
        bottomGrid[2][col] = left[1];
        bottomGrid[3][col] = midV;

        topGrid[0][col] = midV;
        topGrid[1][col] = right[0];
        topGrid[2][col] = right[1];
        topGrid[3][col] = g[3][col];
      }

      this.patches.splice(patchIdx, 1,
        new NurbsPatch(bottomGrid, cloneWeights(patch.weights)),
        new NurbsPatch(topGrid, cloneWeights(patch.weights))
      );
    }
  }

  // =========================================================================
  // Subdivision — split one patch into 3×3 = 9 sub-patches
  // =========================================================================

  /**
   * Subdivide a patch into 9 sub-patches via De Casteljau at t=1/3 and t=2/3.
   * Each 3×3 cage cell becomes its own 4×4 NURBS patch.
   * Geometry is preserved exactly. Internal boundaries are watertight by construction.
   */
  subdividePatch(patchIdx: number): void {
    const g = this.patches[patchIdx].grid;

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

    this.patches.splice(patchIdx, 1, ...result);
  }

  // =========================================================================
  // Serialization / Deserialization
  // =========================================================================

  serialize(): SerializedPatchCage {
    const vertexMap = new Map<CageVertex, number>();
    const vertices: Vec3[] = [];

    // Collect all unique vertices
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

    return {vertices, patches, arcConstraints};
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

    return cage;
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
}

// =========================================================================
// Helpers
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt*mt*mt, 3*mt*mt*t, 3*mt*t*t, t*t*t];
}

/**
 * De Casteljau split of 4 cubic Bézier control points at parameter t.
 * Returns: left half (2 interior CageVertex), midpoint Vec3, right half (2 interior CageVertex).
 * The original endpoints are reused (shared by identity).
 */
function splitBezierRow(p0: CageVertex, p1: CageVertex, p2: CageVertex, p3: CageVertex, t: number): {
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

function cloneWeights(w: number[][]): number[][] {
  return w.map(row => [...row]);
}

/**
 * Compute the center of a circular arc given two endpoints, radius, angle, and plane normal.
 */
function computeArcCenter(p0: Vec3, p3: Vec3, radius: number, angleDeg: number, planeNormal: Vec3): Vec3 {
  const mid = vlerp(p0, p3, 0.5);
  const chord = vsub(p3, p0);
  const chordLen = vdist(p0, p3);

  // Direction from midpoint to center: perpendicular to chord, in the arc plane
  const chordDir = vnormalize(chord);
  const perpDir = vnormalize(vcross(planeNormal, chordDir));

  // Distance from chord midpoint to center
  const halfChord = chordLen / 2;
  const angleRad = (angleDeg * Math.PI) / 180;
  // For a circular arc: halfChord = radius * sin(angle/2)
  // So: d = sqrt(radius² - halfChord²) = radius * cos(angle/2)
  const d = radius * Math.cos(angleRad / 2);

  // Center is at midpoint + d * perpDir (or - depending on arc direction)
  // Convention: positive d means center is on the side perpDir points to
  return vadd(mid, vscale(perpDir, -d));
}

// =========================================================================
// Builder helpers for primitives
// =========================================================================

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

function lerpVert(a: CageVertex, b: CageVertex, t: number): CageVertex {
  const p = vlerp(a.position, b.position, t);
  return new CageVertex(p[0], p[1], p[2]);
}
