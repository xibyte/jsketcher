import * as vec from 'math/vec';
import {Vec3} from 'math/vec';
import {BSPTolerances} from './bspTolerances';

export interface CSGVertex {
  pos: Vec3;
  normal: Vec3;
}

export interface CSGTriangle {
  vertices: [CSGVertex, CSGVertex, CSGVertex];
  normal: Vec3;
  originFaceId: string;
  originSurface: any;
}

export interface CSGPlane {
  normal: Vec3;
  w: number;
}

const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

export {COPLANAR, FRONT, BACK, SPANNING};

export function classifyVertex(
  pos: Vec3,
  planeNormal: Vec3,
  planeW: number,
  epsilon: number
): number {
  const dist = vec.dot(planeNormal, pos) - planeW;
  if (dist > epsilon) return FRONT;
  if (dist < -epsilon) return BACK;
  return COPLANAR;
}

export function planeFromTriangle(tri: CSGTriangle): CSGPlane {
  const a = tri.vertices[0].pos;
  const b = tri.vertices[1].pos;
  const c = tri.vertices[2].pos;
  const normal = vec._normalize(vec.cross(vec.sub(b, a), vec.sub(c, a)));
  const w = vec.dot(normal, a);
  return {normal, w};
}

export function triangleArea(v0: Vec3, v1: Vec3, v2: Vec3): number {
  const ab = vec.sub(v1, v0);
  const ac = vec.sub(v2, v0);
  return vec.length(vec.cross(ab, ac)) * 0.5;
}

export function lerpVertex(a: CSGVertex, b: CSGVertex, t: number): CSGVertex {
  return {
    pos: [
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t,
    ] as Vec3,
    normal: vec._normalize([
      a.normal[0] + (b.normal[0] - a.normal[0]) * t,
      a.normal[1] + (b.normal[1] - a.normal[1]) * t,
      a.normal[2] + (b.normal[2] - a.normal[2]) * t,
    ] as Vec3),
  };
}

export interface SplitResult {
  front: CSGTriangle[];
  back: CSGTriangle[];
  coplanarFront: CSGTriangle[];
  coplanarBack: CSGTriangle[];
}

function makeTriFromVerts(
  verts: CSGVertex[],
  origin: CSGTriangle
): CSGTriangle | null {
  if (verts.length < 3) return null;
  const v0 = verts[0].pos, v1 = verts[1].pos, v2 = verts[2].pos;
  const ab = vec.sub(v1, v0);
  const ac = vec.sub(v2, v0);
  const n = vec.cross(ab, ac);
  if (vec.lengthSq(n) < 1e-20) return null;
  return {
    vertices: [verts[0], verts[1], verts[2]],
    normal: vec._normalize(n) as Vec3,
    originFaceId: origin.originFaceId,
    originSurface: origin.originSurface,
  };
}

export function splitTriangleByPlane(
  tri: CSGTriangle,
  planeNormal: Vec3,
  planeW: number,
  tolerances: BSPTolerances
): SplitResult {
  const result: SplitResult = {
    front: [],
    back: [],
    coplanarFront: [],
    coplanarBack: [],
  };

  const types: number[] = [];
  let polygonType = 0;

  for (let i = 0; i < 3; i++) {
    const t = classifyVertex(tri.vertices[i].pos, planeNormal, planeW, tolerances.planeEpsilon);
    types.push(t);
    polygonType |= t;
  }

  switch (polygonType) {
    case COPLANAR:
      if (vec.dot(tri.normal, planeNormal) > 0) {
        result.coplanarFront.push(tri);
      } else {
        result.coplanarBack.push(tri);
      }
      break;

    case FRONT:
      result.front.push(tri);
      break;

    case BACK:
      result.back.push(tri);
      break;

    case SPANNING: {
      const f: CSGVertex[] = [];
      const b: CSGVertex[] = [];

      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        const ti = types[i];
        const tj = types[j];
        const vi = tri.vertices[i];
        const vj = tri.vertices[j];

        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(vi);

        if ((ti | tj) === SPANNING) {
          const denom = vec.dot(planeNormal, vec.sub(vj.pos, vi.pos));
          let t = (planeW - vec.dot(planeNormal, vi.pos)) / denom;
          t = Math.max(0, Math.min(1, t));
          const v = lerpVertex(vi, vj, t);
          f.push(v);
          b.push(v);
        }
      }

      if (f.length >= 3) {
        const t0 = makeTriFromVerts(f, tri);
        if (t0) result.front.push(t0);
        if (f.length >= 4) {
          const t1 = makeTriFromVerts([f[0], f[2], f[3]], tri);
          if (t1) result.front.push(t1);
        }
      }
      if (b.length >= 3) {
        const t0 = makeTriFromVerts(b, tri);
        if (t0) result.back.push(t0);
        if (b.length >= 4) {
          const t1 = makeTriFromVerts([b[0], b[2], b[3]], tri);
          if (t1) result.back.push(t1);
        }
      }
      break;
    }
  }

  return result;
}

export function flipTriangle(tri: CSGTriangle): CSGTriangle {
  return {
    vertices: [
      tri.vertices[0],
      tri.vertices[2],
      tri.vertices[1],
    ],
    normal: vec.negate(tri.normal) as Vec3,
    originFaceId: tri.originFaceId,
    originSurface: tri.originSurface,
  };
}
