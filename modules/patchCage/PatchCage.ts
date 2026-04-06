/**
 * Patch Cage — the main container for the Bézier/NURBS patch surface model.
 *
 * Graph: Vertices → Edges → Patches → CageNodes
 * Edges define continuity. CageNodes define local surface shape. Patches are glue.
 */

import {PCVertex, PCEdge, PCPatch, PCCageNode, Vec3, EdgeType} from './patchCageTypes';
import {vadd, vsub, vscale, vlerp, vnormalize, vdist, vcross} from './vec3Math';

export class PatchCage {
  vertices: PCVertex[] = [];
  edges: PCEdge[] = [];
  patches: PCPatch[] = [];

  private nextVertId = 0;
  private nextEdgeId = 0;
  private nextPatchId = 0;

  // =========================================================================
  // Construction
  // =========================================================================

  addVertex(position: Vec3): number {
    const id = this.nextVertId++;
    this.vertices.push({id, position});
    return id;
  }

  addEdge(v0: number, v1: number, type: EdgeType = 'bezier'): number {
    const id = this.nextEdgeId++;
    const p0 = this.vertices[v0].position;
    const p1 = this.vertices[v1].position;

    // Initialize handles with G1 enforcement
    const dir = vnormalize(vsub(p1, p0));
    const L = vdist(p0, p1) / 3;
    const h0 = vadd(p0, vscale(dir, L));
    const h1 = vsub(p1, vscale(dir, L));

    this.edges.push({id, v0, v1, h0, h1, type});
    return id;
  }

  /**
   * Add a quad patch defined by 4 edges.
   * Edges must form a closed loop: e0→e1→e2→e3→back to start.
   * Edge flips indicate if the edge is traversed in reverse direction.
   */
  addPatch(
    edges: [number, number, number, number],
    flips: [boolean, boolean, boolean, boolean]
  ): number {
    const id = this.nextPatchId++;
    const cage = this.buildCageFromEdges(edges, flips);
    this.patches.push({id, edges, edgeFlips: flips, cage});
    return id;
  }

  // =========================================================================
  // G1 Enforcement
  // =========================================================================

  enforceG1(edgeId: number): void {
    const edge = this.edges[edgeId];
    const p0 = this.vertices[edge.v0].position;
    const p1 = this.vertices[edge.v1].position;

    const dir = vnormalize(vsub(p1, p0));
    const L = vdist(p0, p1) / 3;

    edge.h0 = vadd(p0, vscale(dir, L));
    edge.h1 = vsub(p1, vscale(dir, L));
  }

  enforceAllG1(): void {
    for (let i = 0; i < this.edges.length; i++) {
      this.enforceG1(i);
    }
  }

  // =========================================================================
  // Edge Evaluation (cubic Bézier)
  // =========================================================================

  evalEdge(edgeId: number, t: number): Vec3 {
    const edge = this.edges[edgeId];
    const p0 = this.vertices[edge.v0].position;
    const p1 = this.vertices[edge.v1].position;
    return evalCubicBezier(p0, edge.h0, edge.h1, p1, t);
  }

  evalEdgeFlipped(edgeId: number, t: number, flip: boolean): Vec3 {
    return flip ? this.evalEdge(edgeId, 1 - t) : this.evalEdge(edgeId, t);
  }

  // =========================================================================
  // Cage-Node Construction from Edges (Coons Patch)
  // =========================================================================

  buildCageFromEdges(
    edgeIds: [number, number, number, number],
    flips: [boolean, boolean, boolean, boolean]
  ): PCCageNode {
    // Build 3x3 control grid using Coons-like interpolation.
    // The boundary control points come from edge evaluation at t=0, 1/3, 2/3, 1.
    // Interior points are derived via bilinear blending.

    // Edge layout (parametric):
    //   edge0: bottom (u varies, v=0)  from corner(0,0) to corner(1,0)
    //   edge1: right  (v varies, u=1)  from corner(1,0) to corner(1,1)
    //   edge2: top    (u varies, v=1)  from corner(1,1) to corner(0,1) — reversed
    //   edge3: left   (v varies, u=0)  from corner(0,1) to corner(0,0) — reversed

    const e = (idx: number, t: number) => this.evalEdgeFlipped(edgeIds[idx], t, flips[idx]);

    // Corners
    const c00 = e(0, 0);
    const c10 = e(0, 1);
    const c11 = e(2, 0); // top edge starts at (1,1) and goes to (0,1)
    const c01 = e(2, 1);

    // Edge midpoints (at 1/3 and 2/3)
    const b_01 = e(0, 1/3);  // bottom at 1/3
    const b_02 = e(0, 2/3);  // bottom at 2/3

    const r_01 = e(1, 1/3);  // right at 1/3
    const r_02 = e(1, 2/3);  // right at 2/3

    const t_01 = e(2, 2/3);  // top at 2/3 (reversed: maps to u=1/3 at v=1)
    const t_02 = e(2, 1/3);  // top at 1/3 (reversed: maps to u=2/3 at v=1)

    const l_01 = e(3, 2/3);  // left at 2/3 (reversed: maps to v=1/3 at u=0)
    const l_02 = e(3, 1/3);  // left at 1/3 (reversed: maps to v=2/3 at u=0)

    // Interior points via Coons interpolation:
    // S(u,v) = Lc(u,v) + Ld(u,v) - B(u,v)
    // where Lc blends u-direction edges, Ld blends v-direction edges,
    // and B is bilinear correction from corners.

    function coons(u: number, v: number): Vec3 {
      // Linear blend of bottom-top
      const edgeU0 = e(0, u);       // bottom at u
      const edgeU1 = e(2, 1 - u);   // top at u (reversed)
      const Lc = vlerp(edgeU0, edgeU1, v);

      // Linear blend of left-right
      const edgeV0 = e(3, 1 - v);   // left at v (reversed)
      const edgeV1 = e(1, v);       // right at v
      const Ld = vlerp(edgeV0, edgeV1, u);

      // Bilinear correction
      const B = vadd(
        vadd(vscale(c00, (1-u)*(1-v)), vscale(c10, u*(1-v))),
        vadd(vscale(c01, (1-u)*v), vscale(c11, u*v))
      );

      return vsub(vadd(Lc, Ld), B);
    }

    // Build 3x3 grid sampling at u,v = 0, 0.5, 1
    const control: Vec3[][] = [];
    for (let j = 0; j < 3; j++) {
      const row: Vec3[] = [];
      const v = j / 2;
      for (let i = 0; i < 3; i++) {
        const u = i / 2;
        row.push(coons(u, v));
      }
      control.push(row);
    }

    return {control};
  }

  // =========================================================================
  // Patch Evaluation (Coons Surface)
  // =========================================================================

  evalPatch(patchId: number, u: number, v: number): Vec3 {
    const patch = this.patches[patchId];
    const [e0, e1, e2, e3] = patch.edges;
    const [f0, f1, f2, f3] = patch.edgeFlips;

    const eeval = (idx: number, t: number) =>
      this.evalEdgeFlipped(patch.edges[idx], t, patch.edgeFlips[idx]);

    // Coons patch
    const edgeU0 = eeval(0, u);
    const edgeU1 = eeval(2, 1 - u);
    const Lc = vlerp(edgeU0, edgeU1, v);

    const edgeV0 = eeval(3, 1 - v);
    const edgeV1 = eeval(1, v);
    const Ld = vlerp(edgeV0, edgeV1, u);

    const c00 = eeval(0, 0);
    const c10 = eeval(0, 1);
    const c11 = eeval(2, 0);
    const c01 = eeval(2, 1);

    const B = vadd(
      vadd(vscale(c00, (1-u)*(1-v)), vscale(c10, u*(1-v))),
      vadd(vscale(c01, (1-u)*v), vscale(c11, u*v))
    );

    return vsub(vadd(Lc, Ld), B);
  }

  evalPatchNormal(patchId: number, u: number, v: number): Vec3 {
    const eps = 1e-4;
    const u0 = Math.max(0, u - eps), u1 = Math.min(1, u + eps);
    const v0 = Math.max(0, v - eps), v1 = Math.min(1, v + eps);

    const du = vsub(this.evalPatch(patchId, u1, v), this.evalPatch(patchId, u0, v));
    const dv = vsub(this.evalPatch(patchId, u, v1), this.evalPatch(patchId, u, v0));

    return vnormalize(vcross(du, dv));
  }

  // =========================================================================
  // Editing Operations
  // =========================================================================

  moveVertex(vertId: number, newPos: Vec3): void {
    this.vertices[vertId].position = newPos;

    // Enforce G1 on all connected edges
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (e.v0 === vertId || e.v1 === vertId) {
        this.enforceG1(i);
      }
    }

    // Update affected patches
    this.updatePatchesForVertex(vertId);
  }

  splitEdge(edgeId: number, t: number): {newVertex: number, newEdges: [number, number]} {
    const edge = this.edges[edgeId];
    const p = this.evalEdge(edgeId, t);
    const vmid = this.addVertex(p);

    // Split Bézier at t using de Casteljau
    const p0 = this.vertices[edge.v0].position;
    const p3 = this.vertices[edge.v1].position;
    const {left, right} = splitCubicBezier(p0, edge.h0, edge.h1, p3, t);

    // Create two new edges
    const e1 = this.nextEdgeId++;
    const e2 = this.nextEdgeId++;

    this.edges.push({id: e1, v0: edge.v0, v1: vmid, h0: left.h0, h1: left.h1, type: edge.type});
    this.edges.push({id: e2, v0: vmid, v1: edge.v1, h0: right.h0, h1: right.h1, type: edge.type});

    // Update patches referencing the old edge
    for (const patch of this.patches) {
      for (let i = 0; i < 4; i++) {
        if (patch.edges[i] === edgeId) {
          // This patch needs to be split — for now, just update reference
          // Full patch splitting is a stretch goal
          patch.edges[i] = e1; // temporary: use first half
        }
      }
    }

    this.enforceG1(e1);
    this.enforceG1(e2);

    return {newVertex: vmid, newEdges: [e1, e2]};
  }

  // =========================================================================
  // Internal Updates
  // =========================================================================

  private updatePatchesForVertex(vertId: number): void {
    // Find edges connected to this vertex
    const connectedEdges = new Set<number>();
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (e.v0 === vertId || e.v1 === vertId) {
        connectedEdges.add(i);
      }
    }

    // Update patches that use any of these edges
    for (const patch of this.patches) {
      if (patch.edges.some(eid => connectedEdges.has(eid))) {
        patch.cage = this.buildCageFromEdges(patch.edges, patch.edgeFlips);
      }
    }
  }

  updateAllPatches(): void {
    for (const patch of this.patches) {
      patch.cage = this.buildCageFromEdges(patch.edges, patch.edgeFlips);
    }
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
    // Sample (n+1) x (n+1) grid
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

    // Build triangle indices
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
    vertices: Float32Array,
    normals: Float32Array,
    indices: Uint32Array,
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

      for (let i = 0; i < tess.positions.length; i++) allPos.push(tess.positions[i]);
      for (let i = 0; i < tess.normals.length; i++) allNorm.push(tess.normals[i]);
      for (let i = 0; i < tess.indices.length; i++) allIdx.push(tess.indices[i] + vertOffset);

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

  // =========================================================================
  // Query
  // =========================================================================

  connectedEdges(vertId: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i].v0 === vertId || this.edges[i].v1 === vertId) {
        result.push(i);
      }
    }
    return result;
  }

  adjacentPatches(vertId: number): number[] {
    const edgeSet = new Set(this.connectedEdges(vertId));
    const result: number[] = [];
    for (let i = 0; i < this.patches.length; i++) {
      if (this.patches[i].edges.some(eid => edgeSet.has(eid))) {
        result.push(i);
      }
    }
    return result;
  }
}

// =========================================================================
// Cubic Bézier helpers
// =========================================================================

function evalCubicBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    mt3*p0[0] + 3*mt2*t*p1[0] + 3*mt*t2*p2[0] + t3*p3[0],
    mt3*p0[1] + 3*mt2*t*p1[1] + 3*mt*t2*p2[1] + t3*p3[1],
    mt3*p0[2] + 3*mt2*t*p1[2] + 3*mt*t2*p2[2] + t3*p3[2],
  ];
}

function splitCubicBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): {
  left: {h0: Vec3, h1: Vec3},
  right: {h0: Vec3, h1: Vec3}
} {
  // de Casteljau split
  const a = vlerp(p0, p1, t);
  const b = vlerp(p1, p2, t);
  const c = vlerp(p2, p3, t);
  const d = vlerp(a, b, t);
  const e = vlerp(b, c, t);
  // mid = vlerp(d, e, t) — the split point

  return {
    left: {h0: a, h1: d},
    right: {h0: e, h1: c},
  };
}
