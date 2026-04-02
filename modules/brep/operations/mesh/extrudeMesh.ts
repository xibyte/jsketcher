/**
 * Build a watertight indexed triangle mesh from a planar polygon extrusion.
 * Also produces per-face tessellation data for rendering.
 *
 * Bottom cap: concave polygon triangulated via libtess.
 * Top cap: same, offset + reversed winding.
 * Walls: quad strip connecting bottom and top edges.
 */

import Vector from 'math/vector';
import {Triangulate} from '../../../../web/app/cad/tess/triangulation';

export interface ExtrudedMeshData {
  verts: number[];
  tris: number[];
  mergeFrom: number[];
  mergeTo: number[];
}

export interface ExtrudedMeshResult {
  meshData: ExtrudedMeshData;
  // Per-face tessellation in the format tessDataToGeom expects:
  // Each entry is [[v0,v1,v2], null] where vi = [x,y,z]
  bottomTess: any[];
  topTess: any[];
  wallTess: any[][]; // one array per wall segment (one per contour edge)
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

  // Bottom: 0..n-1, Top: n..2n-1
  for (const p of contourPoints) verts.push(p.x, p.y, p.z);
  for (const p of contourPoints) verts.push(p.x + extrusionVector.x, p.y + extrusionVector.y, p.z + extrusionVector.z);

  // Triangulate cap
  const coords = contourPoints.map(p => [p.x, p.y, p.z]);
  const capTris = Triangulate([coords], [normal.x, normal.y, normal.z]);

  const bottomTess: any[] = [];
  const topTess: any[] = [];

  for (let t = 0; t < capTris.length; t += 3) {
    const i0 = nearestIdx(capTris[t], contourPoints);
    const i1 = nearestIdx(capTris[t + 1], contourPoints);
    const i2 = nearestIdx(capTris[t + 2], contourPoints);
    if (i0 === i1 || i1 === i2 || i0 === i2) continue;

    // Bottom: reversed winding (outward = opposite to extrusion)
    tris.push(i0, i2, i1);
    // Top: original winding (outward = along extrusion)
    tris.push(i0 + n, i1 + n, i2 + n);

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

  // Walls: one quad (2 tris) per contour edge
  const wallTess: any[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push(i, j, j + n);
    tris.push(i, j + n, i + n);

    const bi = contourPoints[i], bj = contourPoints[j];
    const ti = [bi.x + extrusionVector.x, bi.y + extrusionVector.y, bi.z + extrusionVector.z];
    const tj = [bj.x + extrusionVector.x, bj.y + extrusionVector.y, bj.z + extrusionVector.z];

    wallTess.push([
      [[[bi.x,bi.y,bi.z], [bj.x,bj.y,bj.z], tj], null],
      [[[bi.x,bi.y,bi.z], tj, ti], null],
    ]);
  }

  return {
    meshData: {verts, tris, mergeFrom: [], mergeTo: []},
    bottomTess,
    topTess,
    wallTess,
  };
}

function nearestIdx(coord: number[], pts: Vector[]): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = coord[0] - pts[i].x, dy = coord[1] - pts[i].y, dz = coord[2] - pts[i].z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
