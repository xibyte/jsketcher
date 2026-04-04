/**
 * Mesh boolean via Manifold with face identity preservation.
 *
 * Each input face gets a faceID. After boolean, Manifold preserves faceID
 * per triangle. We group result triangles by (originalID, faceID) to
 * reconstruct faces with their original BRep references.
 */

import {Shell} from '../../topo/shell';
import {Face} from '../../topo/face';
import {Loop} from '../../topo/loop';
import {Edge} from '../../topo/edge';
import {Vertex} from '../../topo/vertex';
import Vector from 'math/vector';
import BrepCurve from 'geom/curves/brepCurve';
import {createBoundingSurface} from '../../brep-builder';
import * as vec from 'math/vec';

export type BooleanOp = 'union' | 'subtract' | 'intersect';

export interface MeshData {
  verts: number[];
  tris: number[];
  faceIDs: number[];     // per-triangle face ID
  mergeFrom: number[];
  mergeTo: number[];
}

// Maps faceID → original BRep Face (for identity preservation)
export interface FaceOriginMap {
  [faceID: number]: {
    brepFace: any;       // original BRep Face object
    surface: any;        // BrepSurface
  };
}

export interface MeshWithOrigins {
  meshData: MeshData;
  originMap: FaceOriginMap;
  manifoldOriginalID?: number;  // assigned by Manifold.reserveIDs
}

// ============================================================================
// Manifold WASM
// ============================================================================

let _wasm: any = null;
let _initPromise: Promise<any> | null = null;

_initPromise = import('manifold-3d').then((mod: any) => {
  return mod.default({locateFile: () => '/manifold.wasm'});
}).then((wasm: any) => {
  wasm.setup();
  _wasm = wasm;
  console.log('Manifold ready');
  return wasm;
}).catch((e: any) => {
  console.error('Manifold init failed:', e);
  return null;
});

async function ensureManifold(): Promise<any> {
  if (_wasm) return _wasm;
  if (_initPromise) {
    const wasm = await _initPromise;
    if (wasm) return wasm;
  }
  throw new Error('Manifold is not available');
}

// ============================================================================
// Boolean operation
// ============================================================================

export interface BooleanResult {
  shell: Shell;
  meshWithOrigins: MeshWithOrigins;
}

export interface ManifoldTolerances {
  meshTolerance?: number;
  meshSimplifyTolerance?: number;
  vertexSnapTolerance?: number;
  edgeGroupingTolerance?: number;
}

export async function manifoldBooleanRaw(
  dataA: MeshWithOrigins,
  dataB: MeshWithOrigins,
  op: BooleanOp,
  tolerances?: ManifoldTolerances
): Promise<BooleanResult> {
  const wasm = await ensureManifold();

  // Reserve unique IDs so Manifold tracks which mesh each triangle came from
  const idA = dataA.manifoldOriginalID || wasm.Manifold.reserveIDs(1);
  const idB = dataB.manifoldOriginalID || wasm.Manifold.reserveIDs(1);

  console.log(`manifoldBooleanRaw: A=${dataA.meshData.tris.length/3} tris, B=${dataB.meshData.tris.length/3} tris, op=${op}`);
  console.log(`  A has __meshWithOrigins: ${!!dataA.manifoldOriginalID}, B has: ${!!dataB.manifoldOriginalID}`);
  let mA, mB;
  try {
    mA = buildManifold(wasm, dataA.meshData, idA);
    console.log('  A manifold OK');
  } catch(e: any) {
    console.error('  A manifold FAILED:', e.message);
    throw e;
  }
  try {
    mB = buildManifold(wasm, dataB.meshData, idB);
    console.log('  B manifold OK');
  } catch(e: any) {
    console.error('  B manifold FAILED:', e.message);
    console.error('  B data: verts=', dataB.meshData.verts.length/3, 'tris=', dataB.meshData.tris.length/3, 'faceIDs=', dataB.meshData.faceIDs?.length, 'mergeFrom=', dataB.meshData.mergeFrom.length);
    // Dump B's mesh to window for offline testing
    (window as any).__failedMeshB = {
      verts: Array.from(dataB.meshData.verts),
      tris: Array.from(dataB.meshData.tris),
    };
    console.error('  Saved to window.__failedMeshB — paste into standalone test');
    // Validate edges
    const edgeMap = new Map();
    for (let t = 0; t < dataB.meshData.tris.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = dataB.meshData.tris[t+e], b = dataB.meshData.tris[t+(e+1)%3];
        const key = Math.min(a,b) + '_' + Math.max(a,b);
        edgeMap.set(key, (edgeMap.get(key)||0) + 1);
      }
    }
    let bad = 0;
    for (const [key, count] of edgeMap) { if (count !== 2) { bad++; if (bad<=3) console.error('    edge', key, ':', count, 'tris'); } }
    console.error('  non-manifold edges:', bad, '/', edgeMap.size);
    throw e;
  }

  // Apply tolerances if specified
  if (tolerances?.meshTolerance && tolerances.meshTolerance > 0) {
    const tol = tolerances.meshTolerance;
    mA = mA.setTolerance(tol);
    mB = mB.setTolerance(tol);
  }
  if (tolerances?.meshSimplifyTolerance && tolerances.meshSimplifyTolerance > 0) {
    const tol = tolerances.meshSimplifyTolerance;
    mA = mA.simplify(tol);
    mB = mB.simplify(tol);
  }

  let result: any;
  switch (op) {
    case 'union': result = mA.add(mB); break;
    case 'subtract': result = mA.subtract(mB); break;
    case 'intersect': result = mA.intersect(mB); break;
  }

  const out = result.getMesh();

  // Build combined origin map: merge A and B origins, keyed by originalID:faceID
  const combinedOrigins: {[key: string]: {brepFace: any, surface: any}} = {};
  for (const [fid, origin] of Object.entries(dataA.originMap)) {
    combinedOrigins[`${idA}:${fid}`] = origin;
  }
  for (const [fid, origin] of Object.entries(dataB.originMap)) {
    combinedOrigins[`${idB}:${fid}`] = origin;
  }

  // Group result triangles by (originalID, faceID)
  const shellAndMesh = buildResultShell(out, combinedOrigins);

  // Store mesh data on Shell.data for persistence across model rebuilds
  shellAndMesh.shell.data.__meshWithOrigins = shellAndMesh.meshWithOrigins;

  result.delete();
  mA.delete();
  mB.delete();

  return shellAndMesh;
}

// ============================================================================
// Build Manifold from mesh data
// ============================================================================

function buildManifold(wasm: any, data: MeshData, originalID: number): any {
  const triCount = data.tris.length / 3;
  const vertCount = data.verts.length / 3;

  // Validate
  for (let i = 0; i < data.tris.length; i++) {
    if (data.tris[i] < 0 || data.tris[i] >= vertCount) {
      throw new Error(`Invalid triangle index: tris[${i}]=${data.tris[i]}, vertCount=${vertCount}`);
    }
  }

  // Skip faceID sorting and just pass the raw data — sorting may corrupt the mesh
  const faceIDArray = data.faceIDs?.length === triCount
    ? new Uint32Array(data.faceIDs)
    : undefined;

  const meshConfig: any = {
    numProp: 3,
    vertProperties: new Float32Array(data.verts),
    triVerts: new Uint32Array(data.tris),
    mergeFromVert: new Uint32Array(data.mergeFrom),
    mergeToVert: new Uint32Array(data.mergeTo),
    runIndex: new Uint32Array([0]),
    runOriginalID: new Uint32Array([originalID]),
  };
  if (faceIDArray) meshConfig.faceID = faceIDArray;

  return new wasm.Manifold(meshConfig);
}

// ============================================================================
// Result shell construction with face identity
// ============================================================================

function buildResultShell(
  meshOut: any,
  origins: {[key: string]: {brepFace: any, surface: any}}
): BooleanResult {
  const vertProps = meshOut.vertProperties;
  const triVerts = meshOut.triVerts;
  const numProp = meshOut.numProp;
  const faceIDs = meshOut.faceID;
  const runIndex = meshOut.runIndex;
  const runOriginalID = meshOut.runOriginalID;
  const triCount = triVerts.length / 3;

  // Map each triangle to its origin key: originalID:faceID
  const triOriginKeys: string[] = [];
  for (let t = 0; t < triCount; t++) {
    // Find which run this triangle belongs to
    let origID = 0;
    for (let ri = 0; ri < runOriginalID.length; ri++) {
      const start = runIndex[ri] / 3;
      const end = (runIndex[ri + 1] !== undefined ? runIndex[ri + 1] : triVerts.length) / 3;
      if (t >= start && t < end) {
        origID = runOriginalID[ri];
        break;
      }
    }
    const fid = faceIDs ? faceIDs[t] : 0;
    triOriginKeys.push(`${origID}:${fid}`);
  }

  // Group triangles by origin key
  const groups = new Map<string, number[]>();
  for (let t = 0; t < triCount; t++) {
    const key = triOriginKeys[t];
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(t);
  }

  const shell = new Shell();

  // Build new mesh data for chaining subsequent booleans
  const newVerts = Array.from(vertProps);
  const newTris: number[] = [];
  const newFaceIDs: number[] = [];
  const newOriginMap: FaceOriginMap = {};
  let newFaceIdx = 0;

  for (const [key, triIndices] of groups) {
    const origin = origins[key];

    // Use original surface if available, otherwise create from points
    let surface = origin?.surface;
    const tessData: any[] = [];
    const points: Vector[] = [];

    for (const t of triIndices) {
      const i0 = triVerts[t * 3], i1 = triVerts[t * 3 + 1], i2 = triVerts[t * 3 + 2];
      const v0 = [vertProps[i0 * numProp], vertProps[i0 * numProp + 1], vertProps[i0 * numProp + 2]];
      const v1 = [vertProps[i1 * numProp], vertProps[i1 * numProp + 1], vertProps[i1 * numProp + 2]];
      const v2 = [vertProps[i2 * numProp], vertProps[i2 * numProp + 1], vertProps[i2 * numProp + 2]];

      tessData.push([[v0, v1, v2], null]);
      points.push(new Vector(v0[0], v0[1], v0[2]));

      // For new mesh data
      newTris.push(i0, i1, i2);
      newFaceIDs.push(newFaceIdx);
    }

    if (!surface && points.length > 0) {
      try {
        // Compute normal from first triangle
        const t0 = triIndices[0];
        const i0 = triVerts[t0*3], i1 = triVerts[t0*3+1], i2 = triVerts[t0*3+2];
        const v0 = [vertProps[i0*numProp], vertProps[i0*numProp+1], vertProps[i0*numProp+2]];
        const v1 = [vertProps[i1*numProp], vertProps[i1*numProp+1], vertProps[i1*numProp+2]];
        const v2 = [vertProps[i2*numProp], vertProps[i2*numProp+1], vertProps[i2*numProp+2]];
        const n = vec._normalize(vec.cross(vec.sub(v1, v0), vec.sub(v2, v0)));

        const {Plane} = require('geom/impl/plane');
        const planeNormal = new Vector(n[0], n[1], n[2])._normalize();
        const planeW = planeNormal.dot(points[0]);
        surface = createBoundingSurface(points, new Plane(planeNormal, planeW));

        // Verify surface normal matches triangle
        const sn = surface.normalInMiddle();
        const d = sn.x * n[0] + sn.y * n[1] + sn.z * n[2];
        if (d < 0) surface = surface.invert();
      } catch (e) {
        surface = createBoundingSurface(points);
      }
    }

    const face = new Face(surface || null);
    face.data.tessellation = {data: tessData};

    // Preserve original BRep face reference
    if (origin?.brepFace) {
      face.data.__originBrepFace = origin.brepFace;
    }
    face.data.__originKey = key;

    // Build minimal boundary loop
    const boundary = extractBoundaryLoop(triIndices, triVerts, vertProps, numProp, face);
    if (boundary) face.outerLoop = boundary;

    face.shell = shell;
    shell.faces.push(face);

    // Store origin for next boolean in chain
    newOriginMap[newFaceIdx] = {
      brepFace: origin?.brepFace || face,
      surface: surface,
    };
    newFaceIdx++;
  }

  const meshWithOrigins: MeshWithOrigins = {
    meshData: {
      verts: Array.from(newVerts) as number[],
      tris: newTris,
      faceIDs: newFaceIDs,
      mergeFrom: [],
      mergeTo: [],
    },
    originMap: newOriginMap,
  };

  return {shell, meshWithOrigins};
}

// ============================================================================
// Boundary loop extraction
// ============================================================================

function extractBoundaryLoop(
  triIndices: number[], triVerts: Uint32Array,
  vertProps: Float32Array, numProp: number, face: Face
): Loop | null {
  const SNAP = 1e-4;
  function vKey(idx: number): string {
    const x = vertProps[idx * numProp], y = vertProps[idx * numProp + 1], z = vertProps[idx * numProp + 2];
    return `${Math.round(x / SNAP)}_${Math.round(y / SNAP)}_${Math.round(z / SNAP)}`;
  }

  const edgeCount = new Map<string, {a: number, b: number, count: number}>();
  for (const t of triIndices) {
    for (let e = 0; e < 3; e++) {
      const a = triVerts[t * 3 + e], b = triVerts[t * 3 + (e + 1) % 3];
      const ka = vKey(a), kb = vKey(b);
      const ek = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const entry = edgeCount.get(ek);
      if (entry) entry.count++;
      else edgeCount.set(ek, {a, b, count: 1});
    }
  }

  const boundaryEdges: {a: number, b: number}[] = [];
  for (const {a, b, count} of edgeCount.values()) {
    if (count === 1) boundaryEdges.push({a, b});
  }
  if (boundaryEdges.length < 3) return null;

  const adj = new Map<string, number>();
  for (const {a, b} of boundaryEdges) adj.set(vKey(a), b);

  const loop = new Loop(face);
  let curIdx = boundaryEdges[0].a;
  const startKey = vKey(curIdx);
  const visited = new Set<string>();

  for (let safety = 0; safety < boundaryEdges.length + 1; safety++) {
    const k = vKey(curIdx);
    if (visited.has(k)) break;
    visited.add(k);
    const nextIdx = adj.get(k);
    if (nextIdx === undefined) break;

    const vA = new Vertex(new Vector(
      vertProps[curIdx * numProp], vertProps[curIdx * numProp + 1], vertProps[curIdx * numProp + 2]));
    const vB = new Vertex(new Vector(
      vertProps[nextIdx * numProp], vertProps[nextIdx * numProp + 1], vertProps[nextIdx * numProp + 2]));
    const curve = BrepCurve.createLinearCurve(vA.point, vB.point);
    const edge = new Edge(curve, vA, vB);
    loop.halfEdges.push(edge.halfEdge1);

    if (vKey(nextIdx) === startKey) break;
    curIdx = nextIdx;
  }

  if (loop.halfEdges.length >= 3) {
    loop.link();
    return loop;
  }
  return null;
}

// ============================================================================
// Legacy: convert BRep Shell to MeshData (for target solids without __meshData)
// ============================================================================

import brepTess from '../../../../web/app/cad/tess/brep-tess';

export function shellToMeshWithOrigins(shell: Shell): MeshWithOrigins {
  // Non-indexed: each triangle gets its own 3 vertices.
  // mergeFrom/mergeTo tell Manifold which vertices to merge.
  // This avoids the snapping-based deduplication that creates non-manifold meshes.
  const verts: number[] = [];
  const tris: number[] = [];
  const faceIDs: number[] = [];
  const originMap: FaceOriginMap = {};
  const SNAP = 1e-4;

  for (let fi = 0; fi < shell.faces.length; fi++) {
    const face = shell.faces[fi];
    const surface = face.surface;
    const faceNormal = surface.normalInMiddle();
    const fn = [faceNormal.x, faceNormal.y, faceNormal.z];

    originMap[fi] = {brepFace: face, surface};

    let polygons: Vector[][];
    try {
      polygons = brepTess(face);
    } catch (e) {
      continue;
    }

    for (const poly of polygons) {
      if (poly.length < 3) continue;
      for (let i = 2; i < poly.length; i++) {
        const p0 = poly[0], p1 = poly[i - 1], p2 = poly[i];
        const triN = vec.normal3([[p0.x,p0.y,p0.z],[p1.x,p1.y,p1.z],[p2.x,p2.y,p2.z]] as any);

        const idx = verts.length / 3;
        if (vec.dot(triN, fn) >= 0) {
          verts.push(p0.x,p0.y,p0.z, p1.x,p1.y,p1.z, p2.x,p2.y,p2.z);
        } else {
          verts.push(p0.x,p0.y,p0.z, p2.x,p2.y,p2.z, p1.x,p1.y,p1.z);
        }
        tris.push(idx, idx+1, idx+2);
        faceIDs.push(fi);
      }
    }
  }

  // Build merge arrays: vertices at the same position should be merged
  const mergeFrom: number[] = [];
  const mergeTo: number[] = [];
  const buckets = new Map<string, number>();
  const vertCount = verts.length / 3;
  for (let i = 0; i < vertCount; i++) {
    const key = `${Math.round(verts[i*3]/SNAP)}_${Math.round(verts[i*3+1]/SNAP)}_${Math.round(verts[i*3+2]/SNAP)}`;
    const first = buckets.get(key);
    if (first !== undefined) {
      mergeFrom.push(i);
      mergeTo.push(first);
    } else {
      buckets.set(key, i);
    }
  }

  return {
    meshData: {verts, tris, faceIDs, mergeFrom, mergeTo},
    originMap,
  };
}
