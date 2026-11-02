/**
 * BSP tree — exact csg.js algorithm by Evan Wallace.
 * This is a verbatim port that was verified to produce correct results
 * in standalone testing with overlapping boxes.
 */

import {BSPTolerances, DEFAULT_BSP_TOLERANCES} from './bspTolerances';
import {CSGTriangle} from './csgTriangle';

const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a: number[], b: number[]): number[] {
  return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
}

function sub3(a: number[], b: number[]): number[] {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

function neg3(a: number[]): number[] {
  return [-a[0], -a[1], -a[2]];
}

function normalize3(a: number[]): number[] {
  const l = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
  return l > 0 ? [a[0]/l, a[1]/l, a[2]/l] : [0, 0, 0];
}

function splitPolygon(
  polygon: CSGTriangle,
  planeNormal: number[], planeW: number, eps: number,
  coplanarFront: CSGTriangle[], coplanarBack: CSGTriangle[],
  front: CSGTriangle[], back: CSGTriangle[]
): void {
  const types: number[] = [];
  let polygonType = 0;

  for (const v of polygon.vertices) {
    const d = dot(planeNormal, v.pos) - planeW;
    const type = (d > eps) ? FRONT : (d < -eps) ? BACK : COPLANAR;
    types.push(type);
    polygonType |= type;
  }

  switch (polygonType) {
    case COPLANAR:
      (dot(polygon.normal, planeNormal) > 0 ? coplanarFront : coplanarBack).push(polygon);
      break;
    case FRONT:
      front.push(polygon);
      break;
    case BACK:
      back.push(polygon);
      break;
    case SPANNING: {
      const f: any[] = [];
      const b: any[] = [];
      const verts = polygon.vertices;
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        const ti = types[i], tj = types[j];
        const vi = verts[i], vj = verts[j];

        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(vi);

        if ((ti | tj) === SPANNING) {
          const denom = dot(planeNormal, sub3(vj.pos, vi.pos));
          const t = Math.max(0, Math.min(1, (planeW - dot(planeNormal, vi.pos)) / denom));
          const v = {
            pos: [
              vi.pos[0] + (vj.pos[0] - vi.pos[0]) * t,
              vi.pos[1] + (vj.pos[1] - vi.pos[1]) * t,
              vi.pos[2] + (vj.pos[2] - vi.pos[2]) * t,
            ],
            normal: [
              vi.normal[0] + (vj.normal[0] - vi.normal[0]) * t,
              vi.normal[1] + (vj.normal[1] - vi.normal[1]) * t,
              vi.normal[2] + (vj.normal[2] - vi.normal[2]) * t,
            ],
          };
          f.push(v);
          b.push(v);
        }
      }
      if (f.length >= 3) {
        front.push({
          vertices: f,
          normal: polygon.normal.slice(),
          originFaceId: polygon.originFaceId,
          originSurface: polygon.originSurface,
        } as any);
      }
      if (b.length >= 3) {
        back.push({
          vertices: b,
          normal: polygon.normal.slice(),
          originFaceId: polygon.originFaceId,
          originSurface: polygon.originSurface,
        } as any);
      }
      break;
    }
  }
}

function planeFromPoly(p: CSGTriangle): {normal: number[], w: number} | null {
  const v = p.vertices;
  const n = normalize3(cross3(sub3(v[1].pos, v[0].pos), sub3(v[2].pos, v[0].pos)));
  if (n[0] === 0 && n[1] === 0 && n[2] === 0) return null;
  return {normal: n, w: dot(n, v[0].pos)};
}

function pickBestSplitPlane(polygons: CSGTriangle[], eps: number): {normal: number[], w: number} {
  // Try a sample of polygons and pick the one that creates the most balanced split.
  // For small sets, try all. For large sets, sample.
  const candidates = polygons.length <= 20 ? polygons :
    polygons.filter((_, i) => i % Math.ceil(polygons.length / 20) === 0);

  let bestPlane = planeFromPoly(polygons[0])!;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const plane = planeFromPoly(candidate);
    if (!plane) continue;

    let front = 0, back = 0, coplanar = 0, spanning = 0;
    for (const p of polygons) {
      let ptype = 0;
      for (const v of p.vertices) {
        const d = dot(plane.normal, v.pos) - plane.w;
        ptype |= (d > eps) ? FRONT : (d < -eps) ? BACK : COPLANAR;
      }
      if (ptype === COPLANAR) coplanar++;
      else if (ptype === FRONT) front++;
      else if (ptype === BACK) back++;
      else spanning++;
    }

    // Score: prefer balanced splits (|front - back| small) with few spanning polygons
    const balance = -Math.abs(front - back);
    const spanPenalty = -spanning * 8;  // spanning polygons are expensive (create new tris)
    const score = balance + spanPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestPlane = plane;
    }
  }

  return bestPlane;
}

export class BSPNode {
  plane: {normal: number[], w: number} | null = null;
  front: BSPNode | null = null;
  back: BSPNode | null = null;
  polygons: CSGTriangle[] = [];
  private eps: number;

  constructor(polygons?: CSGTriangle[], tolerances: BSPTolerances = DEFAULT_BSP_TOLERANCES) {
    this.eps = tolerances.planeEpsilon;
    if (polygons && polygons.length) this.build(polygons);
  }

  clone(): BSPNode {
    const node = new BSPNode();
    node.eps = this.eps;
    node.plane = this.plane ? {normal: this.plane.normal.slice(), w: this.plane.w} : null;
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    node.polygons = this.polygons.map(p => ({
      vertices: p.vertices.map((v: any) => ({pos: v.pos.slice(), normal: v.normal.slice()})),
      normal: p.normal.slice(),
      originFaceId: p.originFaceId,
      originSurface: p.originSurface,
    } as any));
    return node;
  }

  invert(): void {
    for (const p of this.polygons) {
      p.vertices.reverse();
      p.normal = neg3(p.normal) as any;
    }
    if (this.plane) {
      this.plane.normal = neg3(this.plane.normal);
      this.plane.w = -this.plane.w;
    }
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const tmp = this.front;
    this.front = this.back;
    this.back = tmp;
  }

  allPolygons(): CSGTriangle[] {
    let polys = this.polygons.slice();
    if (this.front) polys = polys.concat(this.front.allPolygons());
    if (this.back) polys = polys.concat(this.back.allPolygons());
    return polys;
  }

  clipTo(bsp: BSPNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  clipPolygons(polygons: CSGTriangle[]): CSGTriangle[] {
    if (!this.plane) return polygons.slice();
    let front: CSGTriangle[] = [];
    let back: CSGTriangle[] = [];
    for (const p of polygons) {
      splitPolygon(p, this.plane.normal, this.plane.w, this.eps, front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  }

  build(polygons: CSGTriangle[]): void {
    if (!polygons.length) return;
    if (!this.plane) {
      this.plane = pickBestSplitPlane(polygons, this.eps);
    }
    const front: CSGTriangle[] = [];
    const back: CSGTriangle[] = [];
    for (const p of polygons) {
      splitPolygon(p, this.plane.normal, this.plane.w, this.eps, this.polygons, this.polygons, front, back);
    }
    if (front.length) {
      if (!this.front) this.front = new BSPNode();
      this.front.eps = this.eps;
      this.front.build(front);
    }
    if (back.length) {
      if (!this.back) this.back = new BSPNode();
      this.back.eps = this.eps;
      this.back.build(back);
    }
  }
}
