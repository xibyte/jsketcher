/**
 * Catmull-Clark subdivision with semi-sharp crease support.
 *
 * References:
 * - Catmull & Clark 1978
 * - DeRose, Kass, Truong 1998 (semi-sharp creases)
 *
 * Crease weights:
 *   0.0 = smooth (standard Catmull-Clark)
 *   1.0 = infinitely sharp (no smoothing across this edge)
 *   0.0-1.0 = semi-sharp (crease weight decreases by 1 each subdivision level)
 */

import {SubDMesh} from './SubDMesh';

type Vec3 = [number, number, number];

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecScale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function vecLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Perform one level of Catmull-Clark subdivision.
 */
export function subdivide(mesh: SubDMesh): SubDMesh {
  const result = new SubDMesh();
  const nV = mesh.vertices.length;
  const nF = mesh.faces.length;
  const edges = mesh.getEdges();
  const nE = edges.length;

  // Edge key → index in edges array
  const edgeKeyToIdx = new Map<string, number>();
  for (let i = 0; i < nE; i++) {
    const [v0, v1] = edges[i];
    edgeKeyToIdx.set(`${Math.min(v0, v1)}_${Math.max(v0, v1)}`, i);
  }

  function edgeIdx(v0: number, v1: number): number {
    return edgeKeyToIdx.get(`${Math.min(v0, v1)}_${Math.max(v0, v1)}`)!;
  }

  // ---- Step 1: Face points ----
  // One new vertex per face at the face centroid.
  // Indices: 0 .. nF - 1 (added first to the empty result mesh)
  const facePointStart = 0;
  for (let fi = 0; fi < nF; fi++) {
    const verts = mesh.faceVertices(fi);
    const centroid: Vec3 = [0, 0, 0];
    for (const vi of verts) {
      const p = mesh.vertices[vi].position;
      centroid[0] += p[0]; centroid[1] += p[1]; centroid[2] += p[2];
    }
    const n = verts.length;
    result.addVertex(centroid[0] / n, centroid[1] / n, centroid[2] / n);
  }

  // ---- Step 2: Edge points ----
  // One new vertex per edge.
  // Indices: nF .. nF + nE - 1
  const edgePointStart = nF;
  for (let ei = 0; ei < nE; ei++) {
    const [v0, v1, crease] = edges[ei];
    const p0 = mesh.vertices[v0].position;
    const p1 = mesh.vertices[v1].position;

    // Find adjacent faces
    const adjFaces: number[] = [];
    for (let hi = 0; hi < mesh.halfEdges.length; hi++) {
      const he = mesh.halfEdges[hi];
      const from = mesh.heFromVertex(hi);
      if ((from === v0 && he.vertex === v1) || (from === v1 && he.vertex === v0)) {
        if (he.face >= 0) adjFaces.push(he.face);
      }
    }

    if (crease >= 1.0 || adjFaces.length < 2) {
      // Sharp edge or boundary: midpoint
      const mid = vecScale(vecAdd(p0, p1), 0.5);
      result.addVertex(mid[0], mid[1], mid[2]);
    } else if (crease > 0) {
      // Semi-sharp: blend between smooth and sharp
      const mid = vecScale(vecAdd(p0, p1), 0.5);
      // Smooth edge point: average of edge midpoint and adjacent face points
      let smoothPt: Vec3 = [0, 0, 0];
      for (const fi of adjFaces) {
        const fp = result.vertices[facePointStart + fi].position;
        smoothPt = vecAdd(smoothPt, fp);
      }
      smoothPt = vecScale(smoothPt, 1 / adjFaces.length);
      smoothPt = vecScale(vecAdd(smoothPt, vecScale(vecAdd(p0, p1), 0.5)), 0.5);
      const pt = vecLerp(smoothPt, mid, crease);
      result.addVertex(pt[0], pt[1], pt[2]);
    } else {
      // Smooth edge point: average of endpoints and adjacent face centroids
      let avg: Vec3 = vecAdd(p0, p1);
      for (const fi of adjFaces) {
        const fp = result.vertices[facePointStart + fi].position;
        avg = vecAdd(avg, fp);
      }
      const total = 2 + adjFaces.length;
      avg = vecScale(avg, 1 / total);
      result.addVertex(avg[0], avg[1], avg[2]);
    }
  }

  // ---- Step 3: Updated vertex positions ----
  // Indices: nF + nE .. nF + nE + nV - 1
  const vertPointStart = nF + nE;
  for (let vi = 0; vi < nV; vi++) {
    const p = mesh.vertices[vi].position;
    const heIndices = mesh.vertexHalfEdges(vi);

    // Find adjacent faces and edges
    const adjFaces = new Set<number>();
    const adjEdges: number[] = [];
    const creaseEdges: {edgeIdx: number, crease: number, otherVert: number}[] = [];

    for (const hi of heIndices) {
      const he = mesh.halfEdges[hi];
      if (he.face >= 0) adjFaces.add(he.face);
      const to = he.vertex;
      const ei = edgeIdx(vi, to);
      if (!adjEdges.includes(ei)) {
        adjEdges.push(ei);
        if (he.crease > 0) {
          creaseEdges.push({edgeIdx: ei, crease: he.crease, otherVert: to});
        }
      }
    }

    const n = adjFaces.size; // valence

    if (mesh.isVertexBoundary(vi) && creaseEdges.length >= 2) {
      // Boundary vertex WITH crease edges: use crease rule to keep position
      const maxCrease = Math.max(...creaseEdges.map(e => e.crease));
      if (maxCrease >= 1.0) {
        // Fully sharp: vertex stays exactly where it is
        result.addVertex(p[0], p[1], p[2]);
      } else {
        // Semi-sharp boundary: blend between boundary smoothing and fixed position
        const boundaryNeighbors: number[] = [];
        for (const hi of heIndices) {
          if (mesh.halfEdges[hi].twin === -1) {
            boundaryNeighbors.push(mesh.halfEdges[hi].vertex);
          }
        }
        if (boundaryNeighbors.length >= 2) {
          const p0 = mesh.vertices[boundaryNeighbors[0]].position;
          const p1 = mesh.vertices[boundaryNeighbors[1]].position;
          const smoothPt = vecScale(vecAdd(vecScale(p, 6), vecAdd(p0, p1)), 1 / 8);
          const pt = vecLerp(smoothPt, p, Math.min(1, maxCrease));
          result.addVertex(pt[0], pt[1], pt[2]);
        } else {
          result.addVertex(p[0], p[1], p[2]);
        }
      }
    } else if (mesh.isVertexBoundary(vi)) {
      // Boundary vertex without crease: standard boundary smoothing
      const boundaryNeighbors: number[] = [];
      for (const hi of heIndices) {
        if (mesh.halfEdges[hi].twin === -1) {
          boundaryNeighbors.push(mesh.halfEdges[hi].vertex);
        }
      }
      if (boundaryNeighbors.length >= 2) {
        const p0 = mesh.vertices[boundaryNeighbors[0]].position;
        const p1 = mesh.vertices[boundaryNeighbors[1]].position;
        const pt = vecScale(vecAdd(vecScale(p, 6), vecAdd(p0, p1)), 1 / 8);
        result.addVertex(pt[0], pt[1], pt[2]);
      } else {
        result.addVertex(p[0], p[1], p[2]);
      }
    } else if (creaseEdges.length >= 2) {
      // Crease vertex: use crease rule
      const maxCrease = Math.max(...creaseEdges.map(e => e.crease));

      // Sharp vertex rule: average of vertex and adjacent crease edge midpoints
      let sharpPt: Vec3 = vecScale(p, 6);
      // Pick the two strongest crease edges
      creaseEdges.sort((a, b) => b.crease - a.crease);
      const ce0 = mesh.vertices[creaseEdges[0].otherVert].position;
      const ce1 = mesh.vertices[creaseEdges[1].otherVert].position;
      sharpPt = vecScale(vecAdd(sharpPt, vecAdd(ce0, ce1)), 1 / 8);

      // Smooth vertex rule: standard Catmull-Clark
      let fAvg: Vec3 = [0, 0, 0];
      for (const fi of adjFaces) {
        const fp = result.vertices[facePointStart + fi].position;
        fAvg = vecAdd(fAvg, fp);
      }
      fAvg = vecScale(fAvg, 1 / n);

      let eAvg: Vec3 = [0, 0, 0];
      for (const ei of adjEdges) {
        const [ev0, ev1] = edges[ei];
        const ep0 = mesh.vertices[ev0].position;
        const ep1 = mesh.vertices[ev1].position;
        eAvg = vecAdd(eAvg, vecScale(vecAdd(ep0, ep1), 0.5));
      }
      eAvg = vecScale(eAvg, 1 / adjEdges.length);

      const smoothPt: Vec3 = vecScale(
        vecAdd(vecAdd(fAvg, vecScale(eAvg, 2)), vecScale(p, n - 3)),
        1 / n
      );

      // Blend based on crease weight
      const pt = vecLerp(smoothPt, sharpPt, Math.min(1, maxCrease));
      result.addVertex(pt[0], pt[1], pt[2]);
    } else {
      // Smooth interior vertex: standard Catmull-Clark rule
      // new_pos = (F + 2R + (n-3)P) / n
      // F = average of adjacent face points
      // R = average of adjacent edge midpoints
      // P = original position
      // n = valence

      let fAvg: Vec3 = [0, 0, 0];
      for (const fi of adjFaces) {
        const fp = result.vertices[facePointStart + fi].position;
        fAvg = vecAdd(fAvg, fp);
      }
      fAvg = vecScale(fAvg, 1 / n);

      let eAvg: Vec3 = [0, 0, 0];
      for (const ei of adjEdges) {
        const [ev0, ev1] = edges[ei];
        const ep0 = mesh.vertices[ev0].position;
        const ep1 = mesh.vertices[ev1].position;
        eAvg = vecAdd(eAvg, vecScale(vecAdd(ep0, ep1), 0.5));
      }
      eAvg = vecScale(eAvg, 1 / adjEdges.length);

      const pt: Vec3 = vecScale(
        vecAdd(vecAdd(fAvg, vecScale(eAvg, 2)), vecScale(p, n - 3)),
        1 / n
      );
      result.addVertex(pt[0], pt[1], pt[2]);
    }
  }

  // ---- Step 4: Build new faces ----
  // Each original face produces N new quad faces (one per vertex of the original face).
  // Each new quad: [vertexPoint, edgePoint, facePoint, edgePoint]
  for (let fi = 0; fi < nF; fi++) {
    const verts = mesh.faceVertices(fi);
    const n = verts.length;
    const facePointIdx = facePointStart + fi;

    for (let i = 0; i < n; i++) {
      const vi = verts[i];
      const viNext = verts[(i + 1) % n];
      const viPrev = verts[(i + n - 1) % n];

      const vertPt = vertPointStart + vi;
      const edgePtNext = edgePointStart + edgeIdx(vi, viNext);
      const edgePtPrev = edgePointStart + edgeIdx(viPrev, vi);

      // New quad: [vertexPoint, nextEdgePoint, facePoint, prevEdgePoint]
      // Crease for new edges: reduce crease by 1 level (semi-sharp)
      const creaseNext = Math.max(0, mesh.edgeCrease(vi, viNext) - 1);
      const creasePrev = Math.max(0, mesh.edgeCrease(viPrev, vi) - 1);
      const avgCrease = (creaseNext + creasePrev) / 2;

      result.addFace([vertPt, edgePtNext, facePointIdx, edgePtPrev], avgCrease > 0.01 ? avgCrease : 0);
    }
  }

  result.linkTwins();

  // Update crease weights on the subdivided mesh edges
  // Each original edge becomes two edges in the subdivided mesh
  for (let ei = 0; ei < nE; ei++) {
    const [v0, v1, crease] = edges[ei];
    if (crease > 0) {
      const newCrease = Math.max(0, crease - 1);
      const edgePt = edgePointStart + ei;
      const vp0 = vertPointStart + v0;
      const vp1 = vertPointStart + v1;
      result.setEdgeCrease(vp0, edgePt, newCrease);
      result.setEdgeCrease(edgePt, vp1, newCrease);
    }
  }

  return result;
}

/**
 * Subdivide a mesh N times.
 */
export function subdivideN(mesh: SubDMesh, levels: number): SubDMesh {
  let current = mesh;
  for (let i = 0; i < levels; i++) {
    current = subdivide(current);
  }
  return current;
}

/**
 * Tessellate a SubD mesh to triangles for rendering.
 *
 * Each quad face is treated as a bilinear patch and sampled at a configurable
 * resolution. Normals are computed per-sample from the actual surface.
 * Non-quad faces use simple fan triangulation with averaged normals.
 *
 * @param tessPerFace Number of subdivisions per face edge for tessellation (default 1 = no extra sampling)
 */
export function tessellateSubD(mesh: SubDMesh, tessPerFace: number = 1): {
  vertices: Float32Array,
  normals: Float32Array,
  indices?: Uint32Array,
  faceTriRanges: [number, number][]
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const faceTriRanges: [number, number][] = [];
  let triIdx = 0;

  // Precompute per-vertex smooth normals (angle-weighted average of adjacent face normals)
  const vertexNormals = computeVertexNormals(mesh);

  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const startTri = triIdx;
    const verts = mesh.faceVertices(fi);

    if (verts.length === 4 && tessPerFace > 1) {
      triIdx = tessellateQuad(mesh, verts, vertexNormals, tessPerFace, positions, normals, triIdx, fi);
    } else if (verts.length === 4) {
      triIdx = emitQuad(mesh, verts, vertexNormals, positions, normals, triIdx, fi);
    } else {
      triIdx = emitFan(mesh, verts, vertexNormals, positions, normals, triIdx, fi);
    }

    faceTriRanges.push([startTri, triIdx]);
  }

  return {
    vertices: new Float32Array(positions),
    normals: new Float32Array(normals),
    faceTriRanges,
  };
}

/**
 * Compute per-vertex-per-face normals.
 * Returns a Map: "vertIdx:faceIdx" → normal.
 *
 * For each vertex at each face, the normal is the angle-weighted average
 * of face normals from faces reachable through smooth (non-creased) edges.
 * This creates hard shading breaks at creased edges.
 */
function computeVertexNormals(mesh: SubDMesh): Vec3[] {
  // We return a flat array indexed by vertex ID.
  // For vertices at crease boundaries this gives the AVERAGE normal,
  // but we also compute per-face normals for those vertices.
  // Since we use non-indexed geometry, we'll compute per-vertex-per-face
  // normals via the perVertexFaceNormal map.

  const faceNormals: Vec3[] = [];
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const verts = mesh.faceVertices(fi);
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < verts.length; i++) {
      const curr = mesh.vertices[verts[i]].position;
      const next = mesh.vertices[verts[(i + 1) % verts.length]].position;
      nx += (curr[1] - next[1]) * (curr[2] + next[2]);
      ny += (curr[2] - next[2]) * (curr[0] + next[0]);
      nz += (curr[0] - next[0]) * (curr[1] + next[1]);
    }
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    faceNormals.push(len > 0 ? [nx / len, ny / len, nz / len] : [0, 0, 1]);
  }

  // Build vertex → face adjacency
  const vertexFaces: number[][] = Array.from({length: mesh.vertices.length}, () => []);
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    for (const vi of mesh.faceVertices(fi)) {
      if (!vertexFaces[vi].includes(fi)) vertexFaces[vi].push(fi);
    }
  }

  // For each vertex+face, BFS through smooth edges to find the smooth normal group
  const perVF = new Map<string, Vec3>();

  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const verts = mesh.faceVertices(fi);
    for (let i = 0; i < verts.length; i++) {
      const vi = verts[i];
      const key = `${vi}:${fi}`;
      if (perVF.has(key)) continue;

      // BFS from this face through smooth edges sharing this vertex
      const visited = new Set<number>();
      const queue = [fi];
      visited.add(fi);

      while (queue.length > 0) {
        const curFi = queue.shift()!;
        const curVerts = mesh.faceVertices(curFi);
        for (let j = 0; j < curVerts.length; j++) {
          const a = curVerts[j], b = curVerts[(j + 1) % curVerts.length];
          if (a !== vi && b !== vi) continue;
          if (mesh.edgeCrease(a, b) > 0.01) continue; // don't cross crease

          for (const adjFi of vertexFaces[vi]) {
            if (visited.has(adjFi)) continue;
            // Check adjacency: adjFi must share the edge (a,b) or at least vertex vi
            const adjVerts = mesh.faceVertices(adjFi);
            const hasA = adjVerts.includes(a), hasB = adjVerts.includes(b);
            if (hasA && hasB) {
              visited.add(adjFi);
              queue.push(adjFi);
            }
          }
        }
      }

      // Compute angle-weighted normal from visited faces
      let nx = 0, ny = 0, nz = 0;
      for (const vfi of visited) {
        const fn = faceNormals[vfi];
        const fverts = mesh.faceVertices(vfi);
        const idx = fverts.indexOf(vi);
        if (idx < 0) continue;

        const prev = mesh.vertices[fverts[(idx + fverts.length - 1) % fverts.length]].position;
        const curr = mesh.vertices[vi].position;
        const next = mesh.vertices[fverts[(idx + 1) % fverts.length]].position;
        const ax = prev[0]-curr[0], ay = prev[1]-curr[1], az = prev[2]-curr[2];
        const bx = next[0]-curr[0], by = next[1]-curr[1], bz = next[2]-curr[2];
        const la = Math.sqrt(ax*ax+ay*ay+az*az);
        const lb = Math.sqrt(bx*bx+by*by+bz*bz);
        let angle = Math.PI / 4; // default
        if (la > 0 && lb > 0) {
          let cos = (ax*bx+ay*by+az*bz)/(la*lb);
          cos = Math.max(-1, Math.min(1, cos));
          angle = Math.acos(cos);
        }
        nx += fn[0]*angle; ny += fn[1]*angle; nz += fn[2]*angle;
      }
      const len = Math.sqrt(nx*nx+ny*ny+nz*nz);
      const normal: Vec3 = len > 0 ? [nx/len, ny/len, nz/len] : faceNormals[fi];

      // Set the same normal for all faces in this smooth group
      for (const vfi of visited) {
        perVF.set(`${vi}:${vfi}`, normal);
      }
    }
  }

  // Store the per-vertex-face normals on the mesh for tessellation to use
  (mesh as any).__perVFNormals = perVF;

  // Return simple per-vertex normals (average across ALL faces) as fallback
  const result: Vec3[] = [];
  for (let vi = 0; vi < mesh.vertices.length; vi++) {
    let nx = 0, ny = 0, nz = 0;
    for (const fi of vertexFaces[vi]) {
      const fn = faceNormals[fi];
      nx += fn[0]; ny += fn[1]; nz += fn[2];
    }
    const len = Math.sqrt(nx*nx+ny*ny+nz*nz);
    result.push(len > 0 ? [nx/len, ny/len, nz/len] : [0, 0, 1]);
  }
  return result;
}

function tessellateQuad(
  mesh: SubDMesh, verts: number[], vertNormals: Vec3[], n: number,
  positions: number[], normals: number[], triIdx: number, faceIdx?: number
): number {
  const p00 = mesh.vertices[verts[0]].position;
  const p10 = mesh.vertices[verts[1]].position;
  const p11 = mesh.vertices[verts[2]].position;
  const p01 = mesh.vertices[verts[3]].position;

  const n00 = faceIdx !== undefined ? getVFNormal(mesh, verts[0], faceIdx, vertNormals) : vertNormals[verts[0]];
  const n10 = faceIdx !== undefined ? getVFNormal(mesh, verts[1], faceIdx, vertNormals) : vertNormals[verts[1]];
  const n11 = faceIdx !== undefined ? getVFNormal(mesh, verts[2], faceIdx, vertNormals) : vertNormals[verts[2]];
  const n01 = faceIdx !== undefined ? getVFNormal(mesh, verts[3], faceIdx, vertNormals) : vertNormals[verts[3]];

  // Sample at (n+1)x(n+1) grid
  const grid: {pos: Vec3, nrm: Vec3}[][] = [];
  for (let j = 0; j <= n; j++) {
    const row: {pos: Vec3, nrm: Vec3}[] = [];
    const v = j / n;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // Bilinear interpolation
      const pos: Vec3 = [
        (1 - u) * (1 - v) * p00[0] + u * (1 - v) * p10[0] + u * v * p11[0] + (1 - u) * v * p01[0],
        (1 - u) * (1 - v) * p00[1] + u * (1 - v) * p10[1] + u * v * p11[1] + (1 - u) * v * p01[1],
        (1 - u) * (1 - v) * p00[2] + u * (1 - v) * p10[2] + u * v * p11[2] + (1 - u) * v * p01[2],
      ];
      const nrm: Vec3 = [
        (1 - u) * (1 - v) * n00[0] + u * (1 - v) * n10[0] + u * v * n11[0] + (1 - u) * v * n01[0],
        (1 - u) * (1 - v) * n00[1] + u * (1 - v) * n10[1] + u * v * n11[1] + (1 - u) * v * n01[1],
        (1 - u) * (1 - v) * n00[2] + u * (1 - v) * n10[2] + u * v * n11[2] + (1 - u) * v * n01[2],
      ];
      const nl = Math.sqrt(nrm[0] * nrm[0] + nrm[1] * nrm[1] + nrm[2] * nrm[2]);
      if (nl > 0) { nrm[0] /= nl; nrm[1] /= nl; nrm[2] /= nl; }
      row.push({pos, nrm});
    }
    grid.push(row);
  }

  // Emit quads as triangle pairs
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      // Triangle 1: a, b, c
      positions.push(a.pos[0], a.pos[1], a.pos[2], b.pos[0], b.pos[1], b.pos[2], c.pos[0], c.pos[1], c.pos[2]);
      normals.push(a.nrm[0], a.nrm[1], a.nrm[2], b.nrm[0], b.nrm[1], b.nrm[2], c.nrm[0], c.nrm[1], c.nrm[2]);
      triIdx++;
      // Triangle 2: a, c, d
      positions.push(a.pos[0], a.pos[1], a.pos[2], c.pos[0], c.pos[1], c.pos[2], d.pos[0], d.pos[1], d.pos[2]);
      normals.push(a.nrm[0], a.nrm[1], a.nrm[2], c.nrm[0], c.nrm[1], c.nrm[2], d.nrm[0], d.nrm[1], d.nrm[2]);
      triIdx++;
    }
  }
  return triIdx;
}

function getVFNormal(mesh: SubDMesh, vi: number, fi: number, fallback: Vec3[]): Vec3 {
  const perVF = (mesh as any).__perVFNormals as Map<string, Vec3> | undefined;
  if (perVF) {
    const n = perVF.get(`${vi}:${fi}`);
    if (n) return n;
  }
  return fallback[vi];
}

function emitQuad(
  mesh: SubDMesh, verts: number[], vertNormals: Vec3[],
  positions: number[], normals: number[], triIdx: number,
  faceIdx?: number
): number {
  const [v0, v1, v2, v3] = verts;
  for (const [a, b, c] of [[v0, v1, v2], [v0, v2, v3]]) {
    const pa = mesh.vertices[a].position, pb = mesh.vertices[b].position, pc = mesh.vertices[c].position;
    const na = faceIdx !== undefined ? getVFNormal(mesh, a, faceIdx, vertNormals) : vertNormals[a];
    const nb = faceIdx !== undefined ? getVFNormal(mesh, b, faceIdx, vertNormals) : vertNormals[b];
    const nc = faceIdx !== undefined ? getVFNormal(mesh, c, faceIdx, vertNormals) : vertNormals[c];
    positions.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], pc[0], pc[1], pc[2]);
    normals.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
    triIdx++;
  }
  return triIdx;
}

function emitFan(
  mesh: SubDMesh, verts: number[], vertNormals: Vec3[],
  positions: number[], normals: number[], triIdx: number,
  faceIdx?: number
): number {
  for (let i = 2; i < verts.length; i++) {
    for (const vi of [verts[0], verts[i - 1], verts[i]]) {
      const p = mesh.vertices[vi].position;
      const n = faceIdx !== undefined ? getVFNormal(mesh, vi, faceIdx, vertNormals) : vertNormals[vi];
      positions.push(p[0], p[1], p[2]);
      normals.push(n[0], n[1], n[2]);
    }
    triIdx++;
  }
  return triIdx;
}
