/**
 * Half-edge SubD mesh data structure with crease weights.
 *
 * Supports Catmull-Clark subdivision with semi-sharp creases.
 * Designed for exact NURBS conversion of limit surfaces.
 *
 * Topology uses indexed half-edge structure:
 *  - Each half-edge stores: vertex, face, next, prev, twin, crease
 *  - Faces are quads (or n-gons for initial control mesh)
 *  - Vertices store position and optional limit surface data
 */

export interface SubDVertex {
  position: [number, number, number];
  id: number;
}

export interface SubDHalfEdge {
  vertex: number;     // index of the vertex this half-edge points TO
  face: number;       // index of the face this half-edge belongs to (-1 for boundary)
  next: number;       // index of next half-edge in the face loop
  prev: number;       // index of previous half-edge in face loop
  twin: number;       // index of the opposite half-edge (-1 for boundary)
  crease: number;     // crease weight 0.0 (smooth) to 1.0 (sharp)
}

export interface SubDFace {
  halfEdge: number;   // index of one half-edge bounding this face
  vertexCount: number; // number of vertices (3 for tri, 4 for quad, etc.)
}

export class SubDMesh {
  vertices: SubDVertex[] = [];
  halfEdges: SubDHalfEdge[] = [];
  faces: SubDFace[] = [];

  addVertex(x: number, y: number, z: number): number {
    const id = this.vertices.length;
    this.vertices.push({position: [x, y, z], id});
    return id;
  }

  addFace(vertexIndices: number[], crease: number = 0): number {
    const faceIdx = this.faces.length;
    const n = vertexIndices.length;
    const heStart = this.halfEdges.length;

    // Create half-edges for this face
    for (let i = 0; i < n; i++) {
      this.halfEdges.push({
        vertex: vertexIndices[(i + 1) % n],  // points TO next vertex
        face: faceIdx,
        next: heStart + (i + 1) % n,
        prev: heStart + (i + n - 1) % n,
        twin: -1,
        crease,
      });
    }

    this.faces.push({halfEdge: heStart, vertexCount: n});

    return faceIdx;
  }

  /** Link twin half-edges. Call after all faces are added. */
  linkTwins(): void {
    // Build map: (vertA, vertB) → halfEdge index
    const edgeMap = new Map<string, number>();

    for (let i = 0; i < this.halfEdges.length; i++) {
      const he = this.halfEdges[i];
      const from = this.halfEdges[he.prev].vertex; // vertex this half-edge starts FROM
      const to = he.vertex; // vertex this half-edge goes TO
      const key = `${from}_${to}`;
      edgeMap.set(key, i);
    }

    for (let i = 0; i < this.halfEdges.length; i++) {
      if (this.halfEdges[i].twin !== -1) continue;
      const he = this.halfEdges[i];
      const from = this.halfEdges[he.prev].vertex;
      const to = he.vertex;
      const twinKey = `${to}_${from}`;
      const twinIdx = edgeMap.get(twinKey);
      if (twinIdx !== undefined) {
        this.halfEdges[i].twin = twinIdx;
        this.halfEdges[twinIdx].twin = i;
      }
    }
  }

  /** Get the vertex index that a half-edge starts FROM. */
  heFromVertex(heIdx: number): number {
    return this.halfEdges[this.halfEdges[heIdx].prev].vertex;
  }

  /** Get all half-edges around a vertex (outgoing). */
  vertexHalfEdges(vertIdx: number): number[] {
    const result: number[] = [];
    // Find any half-edge that starts from this vertex
    for (let i = 0; i < this.halfEdges.length; i++) {
      if (this.heFromVertex(i) === vertIdx) {
        result.push(i);
      }
    }
    return result;
  }

  /** Get all vertex indices for a face. */
  faceVertices(faceIdx: number): number[] {
    const face = this.faces[faceIdx];
    const result: number[] = [];
    let he = face.halfEdge;
    for (let i = 0; i < face.vertexCount; i++) {
      result.push(this.heFromVertex(he));
      he = this.halfEdges[he].next;
    }
    return result;
  }

  /** Get crease weight for the edge between two vertices. */
  edgeCrease(v0: number, v1: number): number {
    for (const he of this.halfEdges) {
      if (he.vertex === v1 && this.halfEdges[he.prev].vertex === v0) {
        return he.crease;
      }
    }
    return 0;
  }

  /** Set crease weight for the edge between two vertices. */
  setEdgeCrease(v0: number, v1: number, crease: number): void {
    for (let i = 0; i < this.halfEdges.length; i++) {
      const he = this.halfEdges[i];
      const from = this.heFromVertex(i);
      if ((from === v0 && he.vertex === v1) || (from === v1 && he.vertex === v0)) {
        this.halfEdges[i].crease = Math.max(0, crease);
      }
    }
  }

  /** Check if a vertex is on the boundary (has a half-edge with no twin). */
  isVertexBoundary(vertIdx: number): boolean {
    for (const heIdx of this.vertexHalfEdges(vertIdx)) {
      if (this.halfEdges[heIdx].twin === -1) return true;
    }
    return false;
  }

  /** Get unique edges as pairs [v0, v1, crease]. */
  getEdges(): [number, number, number][] {
    const seen = new Set<string>();
    const edges: [number, number, number][] = [];
    for (let i = 0; i < this.halfEdges.length; i++) {
      const he = this.halfEdges[i];
      const from = this.heFromVertex(i);
      const to = he.vertex;
      const key = Math.min(from, to) + '_' + Math.max(from, to);
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([from, to, he.crease]);
      }
    }
    return edges;
  }
}
