/**
 * Build a watertight indexed triangle mesh from a planar polygon extrusion.
 * Produces per-triangle faceID for Manifold face identity tracking.
 *
 * Face IDs:
 *   0 = bottom cap
 *   1 = top cap
 *   2..n+1 = wall segments (one per contour edge)
 */

import Vector from 'math/vector';
import {earClipIndices} from './earClip';

export interface ExtrudedMeshData {
  verts: number[];
  tris: number[];
  faceIDs: number[];
  mergeFrom: number[];
  mergeTo: number[];
}

export interface ExtrudedMeshResult {
  meshData: ExtrudedMeshData;
  faceCount: number;
  bottomTess: any[];
  topTess: any[];
  wallTess: any[][];
}

export function buildExtrusionMesh(
  contourPoints: Vector[],
  extrusionVector: Vector,
  normal: Vector
): ExtrudedMeshResult {
  const n = contourPoints.length;
  if (n < 3) throw new Error('Need at least 3 contour points');

  const verts: number[] = [];
  const tris: number[] = [];
  const faceIDs: number[] = [];

  // Bottom: 0..n-1, Top: n..2n-1
  for (const p of contourPoints) verts.push(p.x, p.y, p.z);
  for (const p of contourPoints) verts.push(p.x + extrusionVector.x, p.y + extrusionVector.y, p.z + extrusionVector.z);

  // Determine wall winding by building one wall triangle and checking
  // if its normal points outward (away from the polygon centroid).
  let cx = 0, cy = 0, cz = 0;
  for (const p of contourPoints) { cx += p.x; cy += p.y; cz += p.z; }
  cx /= n; cy /= n; cz /= n;

  // Test wall triangle (0, 1, 1+n) — does its normal point away from centroid?
  const p0 = contourPoints[0], p1 = contourPoints[1];
  const t0 = {x: p0.x + extrusionVector.x, y: p0.y + extrusionVector.y, z: p0.z + extrusionVector.z};
  const t1 = {x: p1.x + extrusionVector.x, y: p1.y + extrusionVector.y, z: p1.z + extrusionVector.z};
  // Triangle (p0, p1, t1) normal via cross product
  const abx = p1.x-p0.x, aby = p1.y-p0.y, abz = p1.z-p0.z;
  const acx = t1.x-p0.x, acy = t1.y-p0.y, acz = t1.z-p0.z;
  const wnx = aby*acz - abz*acy, wny = abz*acx - abx*acz, wnz = abx*acy - aby*acx;
  // Wall midpoint
  const wmx = (p0.x+p1.x+t1.x)/3, wmy = (p0.y+p1.y+t1.y)/3, wmz = (p0.z+p1.z+t1.z)/3;
  // Vector from centroid to wall midpoint
  const toCx = wmx - cx, toCy = wmy - cy, toCz = wmz - cz;
  // If wall normal points same direction as centroid-to-wall vector, winding is correct
  const wallOutward = (wnx*toCx + wny*toCy + wnz*toCz) > 0;

  const FACE_BOTTOM = 0;
  const FACE_TOP = 1;

  const bottomTess: any[] = [];
  const topTess: any[] = [];

  // Ear-clip triangulation: works on indices directly, no new vertices
  const capIndices = earClipIndices(contourPoints, normal);

  for (let t = 0; t < capIndices.length; t += 3) {
    const i0 = capIndices[t], i1 = capIndices[t + 1], i2 = capIndices[t + 2];

    // Bottom: reversed winding (outward = opposite to extrusion)
    tris.push(i0, i2, i1);
    faceIDs.push(FACE_BOTTOM);
    // Top: original winding
    tris.push(i0 + n, i1 + n, i2 + n);
    faceIDs.push(FACE_TOP);

    const bp0 = contourPoints[i0], bp1 = contourPoints[i1], bp2 = contourPoints[i2];
    bottomTess.push([
      [[bp0.x, bp0.y, bp0.z], [bp2.x, bp2.y, bp2.z], [bp1.x, bp1.y, bp1.z]],
      null
    ]);
    topTess.push([
      [[bp0.x + extrusionVector.x, bp0.y + extrusionVector.y, bp0.z + extrusionVector.z],
       [bp1.x + extrusionVector.x, bp1.y + extrusionVector.y, bp1.z + extrusionVector.z],
       [bp2.x + extrusionVector.x, bp2.y + extrusionVector.y, bp2.z + extrusionVector.z]],
      null
    ]);
  }

  // Walls
  const wallTess: any[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const wallFaceID = 2 + i;

    if (wallOutward) {
      tris.push(i, j, j + n);
      tris.push(i, j + n, i + n);
    } else {
      tris.push(i, j + n, j);
      tris.push(i, i + n, j + n);
    }
    faceIDs.push(wallFaceID);
    faceIDs.push(wallFaceID);

    const bi = contourPoints[i], bj = contourPoints[j];
    const ti = [bi.x + extrusionVector.x, bi.y + extrusionVector.y, bi.z + extrusionVector.z];
    const tj = [bj.x + extrusionVector.x, bj.y + extrusionVector.y, bj.z + extrusionVector.z];

    if (wallOutward) {
      wallTess.push([
        [[[bi.x, bi.y, bi.z], [bj.x, bj.y, bj.z], tj], null],
        [[[bi.x, bi.y, bi.z], tj, ti], null],
      ]);
    } else {
      wallTess.push([
        [[[bi.x, bi.y, bi.z], tj, [bj.x, bj.y, bj.z]], null],
        [[[bi.x, bi.y, bi.z], ti, tj], null],
      ]);
    }
  }

  const capTrisCount = bottomTess.length;
  const wallTrisCount = wallTess.reduce((s, w) => s + w.length, 0);
  console.log(`buildExtrusionMesh: ${n} contour pts, ${capTrisCount} cap tris, ${wallTrisCount} wall tris, ${tris.length/3} total tris, ${faceIDs.length} faceIDs`);
  console.log(`  verts: ${verts.length/3}, walls in wallTess: ${wallTess.length}`);

  return {
    meshData: {verts, tris, faceIDs, mergeFrom: [], mergeTo: []},
    faceCount: 2 + n,
    bottomTess,
    topTess,
    wallTess,
  };
}

