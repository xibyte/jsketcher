/**
 * Mesh boolean via Manifold (manifold-3d).
 *
 * Manifold uses exact arithmetic — handles coplanar faces, touching geometry,
 * consecutive operations. Not BSP-based.
 */

import {Shell} from '../../topo/shell';
import {Face} from '../../topo/face';
import {Loop} from '../../topo/loop';
import {Edge} from '../../topo/edge';
import {Vertex} from '../../topo/vertex';
import Vector from 'math/vector';
import BrepCurve from 'geom/curves/brepCurve';
import {createBoundingSurface} from '../../brep-builder';
import brepTess from '../../../../web/app/cad/tess/brep-tess';
import * as vec from 'math/vec';

export type BooleanOp = 'union' | 'subtract' | 'intersect';

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

export interface MeshData {
  verts: number[];
  tris: number[];
  mergeFrom: number[];
  mergeTo: number[];
}

export async function manifoldBoolean(shellA: Shell, shellB: Shell, op: BooleanOp): Promise<Shell> {
  const dataA = shellToMeshData(shellA);
  const dataB = shellToMeshData(shellB);
  return manifoldBooleanRaw(dataA, dataB, op);
}

export async function manifoldBooleanRaw(dataA: MeshData, dataB: MeshData, op: BooleanOp): Promise<Shell> {
  const wasm = await ensureManifold();

  function buildManifold(data: MeshData) {
    return new wasm.Manifold({
      numProp: 3,
      vertProperties: new Float32Array(data.verts),
      triVerts: new Uint32Array(data.tris),
      mergeFromVert: new Uint32Array(data.mergeFrom),
      mergeToVert: new Uint32Array(data.mergeTo),
    });
  }

  const mA = buildManifold(dataA);
  const mB = buildManifold(dataB);

  let result: any;
  switch (op) {
    case 'union': result = mA.add(mB); break;
    case 'subtract': result = mA.subtract(mB); break;
    case 'intersect': result = mA.intersect(mB); break;
  }

  const out = result.getMesh();
  const shell = meshDataToShell(out.vertProperties, out.triVerts, out.numProp);

  // Attach the clean Manifold output mesh so subsequent booleans use it directly
  // instead of re-tessellating via brepTess
  const resultVerts: number[] = [];
  const resultTris: number[] = [];
  for (let i = 0; i < out.vertProperties.length; i++) resultVerts.push(out.vertProperties[i]);
  for (let i = 0; i < out.triVerts.length; i++) resultTris.push(out.triVerts[i]);
  (shell as any).__meshData = {verts: resultVerts, tris: resultTris, mergeFrom: [], mergeTo: []} as MeshData;

  result.delete();
  mA.delete();
  mB.delete();

  return shell;
}

// ============================================================================
// BRep Shell → flat vertex/triangle arrays
// ============================================================================

export function shellToMeshData(shell: Shell): MeshData {
  // Each triangle gets its own 3 vertices (non-indexed).
  // mergeFromVert/mergeToVert tell Manifold which vertices are the same point.
  // This is what Manifold expects for proper manifold reconstruction.
  const verts: number[] = [];
  const tris: number[] = [];
  const SNAP = 1e-4;
  const vertBuckets = new Map<string, number>(); // key → first vertex index with this position

  function addVert(x: number, y: number, z: number): number {
    const idx = verts.length / 3;
    verts.push(x, y, z);
    return idx;
  }

  function vertKey(x: number, y: number, z: number): string {
    return `${Math.round(x / SNAP)}_${Math.round(y / SNAP)}_${Math.round(z / SNAP)}`;
  }

  for (const face of shell.faces) {
    const polygons = brepTess(face);
    const faceNormal = face.surface.normalInMiddle();
    const fn = [faceNormal.x, faceNormal.y, faceNormal.z];

    for (const poly of polygons) {
      if (poly.length < 3) continue;
      for (let i = 2; i < poly.length; i++) {
        const p0 = poly[0], p1 = poly[i - 1], p2 = poly[i];

        const triN = vec.normal3([[p0.x,p0.y,p0.z],[p1.x,p1.y,p1.z],[p2.x,p2.y,p2.z]] as any);
        let i0, i1, i2;
        if (vec.dot(triN, fn) >= 0) {
          i0 = addVert(p0.x, p0.y, p0.z);
          i1 = addVert(p1.x, p1.y, p1.z);
          i2 = addVert(p2.x, p2.y, p2.z);
        } else {
          i0 = addVert(p0.x, p0.y, p0.z);
          i1 = addVert(p2.x, p2.y, p2.z);
          i2 = addVert(p1.x, p1.y, p1.z);
        }
        tris.push(i0, i1, i2);
      }
    }
  }

  // Build merge arrays: for each vertex, find the first vertex at the same position
  const mergeFrom: number[] = [];
  const mergeTo: number[] = [];
  const vertCount = verts.length / 3;

  for (let i = 0; i < vertCount; i++) {
    const key = vertKey(verts[i*3], verts[i*3+1], verts[i*3+2]);
    const first = vertBuckets.get(key);
    if (first !== undefined && first !== i) {
      mergeFrom.push(i);
      mergeTo.push(first);
    } else {
      vertBuckets.set(key, i);
    }
  }

  return {verts, tris, mergeFrom, mergeTo};
}

// ============================================================================
// Manifold mesh → BRep Shell
// ============================================================================

function meshDataToShell(vertProps: Float32Array, triVerts: Uint32Array, numProp: number): Shell {
  const shell = new Shell();
  const triCount = triVerts.length / 3;
  if (triCount === 0) return shell;

  // Group triangles by normal direction → one Face per group
  const groups: {tris: number[], normal: number[]}[] = [];
  const THRESH = 0.95;

  for (let t = 0; t < triCount; t++) {
    const i0 = triVerts[t*3], i1 = triVerts[t*3+1], i2 = triVerts[t*3+2];
    const v0 = [vertProps[i0*numProp], vertProps[i0*numProp+1], vertProps[i0*numProp+2]];
    const v1 = [vertProps[i1*numProp], vertProps[i1*numProp+1], vertProps[i1*numProp+2]];
    const v2 = [vertProps[i2*numProp], vertProps[i2*numProp+1], vertProps[i2*numProp+2]];

    const n = vec._normalize(vec.cross(vec.sub(v1, v0), vec.sub(v2, v0)));
    if (vec.lengthSq(n) < 1e-20) continue; // degenerate

    let found = false;
    for (const g of groups) {
      if (Math.abs(vec.dot(n, g.normal)) > THRESH) {
        g.tris.push(t);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({tris: [t], normal: n as number[]});
    }
  }

  for (const g of groups) {
    const tessData: any[] = [];
    const points: Vector[] = [];

    for (const t of g.tris) {
      const i0 = triVerts[t*3], i1 = triVerts[t*3+1], i2 = triVerts[t*3+2];
      const v0 = [vertProps[i0*numProp], vertProps[i0*numProp+1], vertProps[i0*numProp+2]];
      const v1 = [vertProps[i1*numProp], vertProps[i1*numProp+1], vertProps[i1*numProp+2]];
      const v2 = [vertProps[i2*numProp], vertProps[i2*numProp+1], vertProps[i2*numProp+2]];

      tessData.push([[v0, v1, v2], null]);
      points.push(new Vector(v0[0], v0[1], v0[2]));
      points.push(new Vector(v1[0], v1[1], v1[2]));
      points.push(new Vector(v2[0], v2[1], v2[2]));
    }

    // Create face with proper surface orientation
    const avgN = g.normal;
    let surface: any;
    try {
      const {Plane} = require('geom/impl/plane');
      const planeNormal = new Vector(avgN[0], avgN[1], avgN[2])._normalize();
      const planeW = planeNormal.dot(points[0]);
      surface = createBoundingSurface(points, new Plane(planeNormal, planeW));
    } catch (e) {
      surface = createBoundingSurface(points);
    }

    // Verify surface normal matches triangle normals
    try {
      const sn = surface.normalInMiddle();
      const d = sn.x * avgN[0] + sn.y * avgN[1] + sn.z * avgN[2];
      if (d < 0) surface = surface.invert();
    } catch (e) { /* keep */ }

    const face = new Face(surface);
    face.data.tessellation = {data: tessData};

    // Build minimal boundary loop
    const boundary = buildBoundaryLoop(g.tris, triVerts, vertProps, numProp, face);
    if (boundary) {
      face.outerLoop = boundary;
    }

    face.shell = shell;
    shell.faces.push(face);
  }

  return shell;
}

function buildBoundaryLoop(
  triIndices: number[], triVerts: Uint32Array,
  vertProps: Float32Array, numProp: number, face: Face
): Loop | null {
  // Find boundary edges (edges with only 1 adjacent triangle)
  const edgeCount = new Map<string, {a: number, b: number, count: number}>();
  const SNAP = 1e-4;
  function vKey(idx: number): string {
    const x = vertProps[idx*numProp], y = vertProps[idx*numProp+1], z = vertProps[idx*numProp+2];
    return `${Math.round(x/SNAP)}_${Math.round(y/SNAP)}_${Math.round(z/SNAP)}`;
  }

  for (const t of triIndices) {
    for (let e = 0; e < 3; e++) {
      const a = triVerts[t*3 + e], b = triVerts[t*3 + (e+1)%3];
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

  // Chain edges
  const adj = new Map<string, number>();
  for (const {a, b} of boundaryEdges) {
    adj.set(vKey(a), b);
  }

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

    const ax = vertProps[curIdx*numProp], ay = vertProps[curIdx*numProp+1], az = vertProps[curIdx*numProp+2];
    const bx = vertProps[nextIdx*numProp], by = vertProps[nextIdx*numProp+1], bz = vertProps[nextIdx*numProp+2];

    const vA = new Vertex(new Vector(ax, ay, az));
    const vB = new Vertex(new Vector(bx, by, bz));
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
