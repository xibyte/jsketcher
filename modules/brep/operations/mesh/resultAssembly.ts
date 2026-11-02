import * as vec from 'math/vec';
import {Vec3} from 'math/vec';
import {BSPTolerances} from './bspTolerances';
import {CSGTriangle} from './csgTriangle';
import {Shell} from '../../topo/shell';
import {Face} from '../../topo/face';
import {Edge} from '../../topo/edge';
import {Loop} from '../../topo/loop';
import {Vertex} from '../../topo/vertex';
import Vector from 'math/vector';
import BrepCurve from 'geom/curves/brepCurve';

/**
 * Convert result CSG triangles back into a BRep Shell for integration with
 * the model layer and rendering pipeline.
 *
 * Each triangle carries its origin face ID and parametric surface reference.
 * Triangles are grouped by origin face, and the tessellation data is stored
 * directly on each Face for rendering (bypassing re-tessellation).
 *
 * @param resultTriangles - Surviving triangles from the BSP boolean
 * @param surfaceMap - Maps face IDs to their BrepSurface objects
 * @param tolerances - For vertex snapping and edge grouping
 */
export function assembleResult(
  resultTriangles: CSGTriangle[],
  surfaceMap: Map<string, any>,
  tolerances: BSPTolerances
): Shell {
  if (resultTriangles.length === 0) {
    return new Shell();
  }

  // Group triangles by origin face
  const faceGroups = new Map<string, CSGTriangle[]>();
  for (const tri of resultTriangles) {
    let group = faceGroups.get(tri.originFaceId);
    if (!group) {
      group = [];
      faceGroups.set(tri.originFaceId, group);
    }
    group.push(tri);
  }

  const shell = new Shell();
  const vertexMap = new VertexSnapper(tolerances.snapEpsilon);

  for (const [faceId, tris] of faceGroups) {
    let surface = surfaceMap.get(faceId) || tris[0].originSurface;
    if (!surface) continue;

    // The BSP may have flipped triangle normals (e.g. cavity walls in subtract).
    // Check if the BSP triangle normals agree with the surface normal.
    // If not, invert the surface so MBrepFace queries return correct orientation.
    const avgTriNormal: Vec3 = [0, 0, 0];
    for (const tri of tris) {
      avgTriNormal[0] += tri.normal[0];
      avgTriNormal[1] += tri.normal[1];
      avgTriNormal[2] += tri.normal[2];
    }
    try {
      const surfNormal = surface.normalInMiddle();
      const d = surfNormal.x * avgTriNormal[0] + surfNormal.y * avgTriNormal[1] + surfNormal.z * avgTriNormal[2];
      if (d < 0) {
        surface = surface.invert();
      }
    } catch (e) { /* keep original */ }

    const face = new Face(surface);
    face.data.id = faceId;

    // Store tessellation data in the format expected by tessDataToGeom.
    // BSP may produce polygons with 3+ vertices (quads from splits).
    // Fan-triangulate and let tessDataToGeom compute normals from winding.
    const tessEntries: any[] = [];
    for (const poly of tris) {
      const verts = poly.vertices;
      for (let i = 2; i < verts.length; i++) {
        tessEntries.push([
          [verts[0].pos, verts[i-1].pos, verts[i].pos],
          null,
        ]);
      }
    }
    face.data.tessellation = { data: tessEntries };

    // Build minimal boundary topology for selection/picking
    const boundary = extractBoundaryLoop(tris, vertexMap, tolerances);
    if (boundary.length > 0) {
      const loop = new Loop(face);
      // Create edges along the boundary
      for (let i = 0; i < boundary.length; i++) {
        const vA = boundary[i];
        const vB = boundary[(i + 1) % boundary.length];
        const curve = BrepCurve.createLinearCurve(vA.point, vB.point);
        const edge = new Edge(curve, vA, vB);
        loop.halfEdges.push(edge.halfEdge1);
      }
      if (loop.halfEdges.length > 0) {
        loop.link();
        face.outerLoop = loop;
      }
    }

    face.shell = shell;
    shell.faces.push(face);
  }

  return shell;
}

/**
 * Extract the outer boundary vertices of a triangle group.
 * Boundary edges are edges shared by exactly one triangle.
 */
function extractBoundaryLoop(
  tris: CSGTriangle[],
  vertexMap: VertexSnapper,
  tolerances: BSPTolerances
): Vertex[] {
  // Count edge occurrences
  const edgeCount = new Map<string, {a: Vertex, b: Vertex, count: number}>();

  for (const tri of tris) {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const posA = tri.vertices[i].pos;
      const posB = tri.vertices[j].pos;
      const vA = vertexMap.getOrCreate(posA);
      const vB = vertexMap.getOrCreate(posB);

      // Use sorted vertex pair as key for undirected edge matching
      const idA = vertexMap.getId(vA);
      const idB = vertexMap.getId(vB);
      const key = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;

      const entry = edgeCount.get(key);
      if (entry) {
        entry.count++;
      } else {
        edgeCount.set(key, {a: vA, b: vB, count: 1});
      }
    }
  }

  // Collect boundary edges (count === 1)
  const boundaryEdges: {a: Vertex, b: Vertex}[] = [];
  for (const {a, b, count} of edgeCount.values()) {
    if (count === 1) {
      boundaryEdges.push({a, b});
    }
  }

  if (boundaryEdges.length === 0) return [];

  // Chain boundary edges into an ordered loop
  return chainEdges(boundaryEdges);
}

/**
 * Chain a set of directed edges into an ordered vertex loop.
 */
function chainEdges(edges: {a: Vertex, b: Vertex}[]): Vertex[] {
  if (edges.length === 0) return [];

  const adjacency = new Map<Vertex, Vertex>();
  for (const {a, b} of edges) {
    adjacency.set(a, b);
  }

  // Walk the chain starting from the first edge
  const result: Vertex[] = [];
  let current = edges[0].a;
  const start = current;
  const visited = new Set<Vertex>();

  for (let safety = 0; safety < edges.length + 1; safety++) {
    if (visited.has(current)) break;
    visited.add(current);
    result.push(current);
    const next = adjacency.get(current);
    if (!next || next === start) break;
    current = next;
  }

  return result;
}

/**
 * Vertex deduplication via spatial snapping.
 */
class VertexSnapper {
  private vertices: {vertex: Vertex, pos: Vec3, id: number}[] = [];
  private nextId = 0;
  private epsilon: number;

  constructor(epsilon: number) {
    this.epsilon = epsilon;
  }

  getOrCreate(pos: Vec3): Vertex {
    const epsSq = this.epsilon * this.epsilon;
    for (const entry of this.vertices) {
      if (vec.distanceSq(entry.pos, pos) < epsSq) {
        return entry.vertex;
      }
    }
    const point = new Vector(pos[0], pos[1], pos[2]);
    const vertex = new Vertex(point);
    this.vertices.push({vertex, pos: vec.clone(pos), id: this.nextId++});
    return vertex;
  }

  getId(vertex: Vertex): number {
    for (const entry of this.vertices) {
      if (entry.vertex === vertex) return entry.id;
    }
    return -1;
  }
}

/**
 * Build a map from face IDs to their BrepSurface objects for result assembly.
 */
export function buildSurfaceMap(shellA: Shell, shellB: Shell, faceIdsA: Map<any, string>, faceIdsB: Map<any, string>): Map<string, any> {
  const map = new Map<string, any>();
  for (const face of shellA.faces) {
    const id = faceIdsA.get(face);
    if (id) map.set(id, face.surface);
  }
  for (const face of shellB.faces) {
    const id = faceIdsB.get(face);
    if (id) map.set(id, face.surface);
  }
  return map;
}

/**
 * Generate stable face IDs for a shell's faces.
 */
export function generateFaceIds(shell: Shell, prefix: string): Map<any, string> {
  const map = new Map<any, string>();
  for (let i = 0; i < shell.faces.length; i++) {
    const face = shell.faces[i];
    const id = face.data?.id || `${prefix}:F${i}`;
    map.set(face, id);
  }
  return map;
}
