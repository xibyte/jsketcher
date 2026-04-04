/**
 * Ear clipping triangulation for simple polygons (no holes).
 * Works directly on indices — no new vertices created.
 * Handles concave polygons correctly.
 *
 * @param points - array of 3D points forming the polygon
 * @param normal - polygon plane normal (for determining CW/CCW and ear testing)
 * @returns array of index triples [i0,i1,i2, ...] into the points array
 */
export function earClipIndices(points: {x: number, y: number, z: number}[], normal: {x: number, y: number, z: number}): number[] {
  const n = points.length;
  if (n < 3) return [];
  if (n === 3) return [0, 1, 2];

  // Project to 2D by dropping the axis most aligned with the normal
  const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
  let getU: (p: any) => number, getV: (p: any) => number;
  if (az >= ax && az >= ay) {
    // Drop Z
    getU = p => p.x; getV = p => p.y;
  } else if (ay >= ax) {
    // Drop Y
    getU = p => p.x; getV = p => p.z;
  } else {
    // Drop X
    getU = p => p.y; getV = p => p.z;
  }

  // Build 2D coords
  const u: number[] = [], v: number[] = [];
  for (const p of points) {
    u.push(getU(p));
    v.push(getV(p));
  }

  // Ensure CCW winding in 2D (flip if needed based on signed area)
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += u[i] * v[j] - u[j] * v[i];
  }

  // Build index list (linked list via array)
  const idx: number[] = [];
  if (area > 0) {
    for (let i = 0; i < n; i++) idx.push(i);
  } else {
    for (let i = n - 1; i >= 0; i--) idx.push(i);
  }

  const tris: number[] = [];
  let count = n;
  let failsafe = count * 2;

  let i = 0;
  while (count > 2 && failsafe-- > 0) {
    const a = idx[i % count];
    const b = idx[(i + 1) % count];
    const c = idx[(i + 2) % count];

    if (isEar(a, b, c, idx, count, u, v)) {
      tris.push(a, b, c);
      // Remove vertex b from the list
      const removeIdx = (i + 1) % count;
      idx.splice(removeIdx, 1);
      count--;
      // Don't advance i — the next ear test starts from same position
      if (i >= count) i = 0;
      failsafe = count * 2; // reset failsafe on success
    } else {
      i++;
      if (i >= count) i = 0;
    }
  }

  return tris;
}

function isEar(
  a: number, b: number, c: number,
  idx: number[], count: number,
  u: number[], v: number[]
): boolean {
  // Check if triangle abc is convex (CCW)
  const cross = (u[b] - u[a]) * (v[c] - v[a]) - (v[b] - v[a]) * (u[c] - u[a]);
  if (cross <= 0) return false; // not convex

  // Check no other vertex is inside the triangle
  for (let k = 0; k < count; k++) {
    const p = idx[k];
    if (p === a || p === b || p === c) continue;
    if (pointInTriangle(u[p], v[p], u[a], v[a], u[b], v[b], u[c], v[c])) {
      return false;
    }
  }

  return true;
}

function pointInTriangle(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
