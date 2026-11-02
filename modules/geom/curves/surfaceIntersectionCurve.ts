import {ParametricCurve} from "./parametricCurve";
import {ParametricSurface, UV} from "../surfaces/parametricSurface";
import * as vec from "math/vec";
import {Vec3} from "math/vec";
import {Matrix3x4Data} from "math/matrix";
import BoundedCurve from "./boundedCurve";
import InvertedCurve from "./invertedCurve";

export interface IntersectionSample {
  point: Vec3;
  uvA: UV;
  uvB: UV;
}

/**
 * A parametric curve representing the intersection of two parametric surfaces.
 *
 * Uses cubic Hermite interpolation between refined sample points for smooth evaluation.
 * Points are refined via Newton iteration to lie exactly on both surfaces.
 * Tangent direction is computed analytically as the cross product of surface normals.
 *
 * Parametrization: integer domain [0, N-1] where N is the number of sample points.
 */
export default class SurfaceIntersectionCurve implements ParametricCurve {

  surfaceA: ParametricSurface;
  surfaceB: ParametricSurface;
  samples: IntersectionSample[];
  private _tangents: Vec3[];

  constructor(
    surfaceA: ParametricSurface,
    surfaceB: ParametricSurface,
    samples: IntersectionSample[]
  ) {
    this.surfaceA = surfaceA;
    this.surfaceB = surfaceB;

    if (samples.length < 2) {
      throw new Error('SurfaceIntersectionCurve requires at least 2 sample points');
    }

    // Refine all samples to exact intersection
    this.samples = samples.map(s =>
      refineIntersectionPoint(surfaceA, surfaceB, s.uvA, s.uvB)
    );

    // Compute tangents at each sample point
    this._tangents = this.samples.map((s, i) =>
      this.computeTangent(s, i)
    );
  }

  private computeTangent(sample: IntersectionSample, index: number): Vec3 {
    const nA = this.surfaceA.normal(sample.uvA[0], sample.uvA[1]);
    const nB = this.surfaceB.normal(sample.uvB[0], sample.uvB[1]);
    const tangent = vec.cross(nA, nB);
    const tangentLen = vec.length(tangent);

    let dir: Vec3;
    if (tangentLen < 1e-10) {
      // Surfaces are tangent here - estimate direction from neighbors
      const prev = index > 0 ? this.samples[index - 1] : null;
      const next = index < this.samples.length - 1 ? this.samples[index + 1] : null;
      if (prev && next) {
        dir = vec._normalize(vec.sub(next.point, prev.point));
      } else if (next) {
        dir = vec._normalize(vec.sub(next.point, sample.point));
      } else if (prev) {
        dir = vec._normalize(vec.sub(sample.point, prev.point));
      } else {
        dir = [1, 0, 0] as Vec3;
      }
    } else {
      dir = vec._normalize(tangent);
    }

    // Ensure tangent direction is consistent with the point sequence
    if (index < this.samples.length - 1) {
      const seg = vec.sub(this.samples[index + 1].point, sample.point);
      if (vec.dot(dir, seg) < 0) {
        vec._negate(dir);
      }
    } else if (index > 0) {
      const seg = vec.sub(sample.point, this.samples[index - 1].point);
      if (vec.dot(dir, seg) < 0) {
        vec._negate(dir);
      }
    }

    // Scale tangent to match parametrization speed (segment length)
    const segLen = this.getLocalSegmentLength(index);
    return vec._mul(dir, segLen);
  }

  private getLocalSegmentLength(index: number): number {
    if (index === 0) {
      return vec.distance(this.samples[0].point, this.samples[1].point);
    }
    if (index === this.samples.length - 1) {
      return vec.distance(this.samples[index - 1].point, this.samples[index].point);
    }
    const d1 = vec.distance(this.samples[index - 1].point, this.samples[index].point);
    const d2 = vec.distance(this.samples[index].point, this.samples[index + 1].point);
    return (d1 + d2) / 2;
  }

  domain(): [number, number] {
    return [0, this.samples.length - 1];
  }

  degree(): number {
    return 3;
  }

  point(u: number): Vec3 {
    const approx = this.hermitePoint(u);
    const uvA = this.surfaceA.param(approx);
    const uvB = this.surfaceB.param(approx);
    return refineIntersectionPoint(this.surfaceA, this.surfaceB, uvA, uvB).point;
  }

  eval(u: number, num: number): Vec3[] {
    const result: Vec3[] = [];

    // Position: refined to exact intersection
    const pt = this.point(u);
    result[0] = pt;

    if (num >= 1) {
      // First derivative: tangent from surface normals, scaled to match parametrization
      const uvA = this.surfaceA.param(pt);
      const uvB = this.surfaceB.param(pt);
      const nA = this.surfaceA.normal(uvA[0], uvA[1]);
      const nB = this.surfaceB.normal(uvB[0], uvB[1]);
      const tangent = vec.cross(nA, nB);
      const tangentLen = vec.length(tangent);

      // Use Hermite derivative for speed scaling
      const hermiteDer = this.hermiteDer1(u);
      const hermiteSpeed = vec.length(hermiteDer);

      if (tangentLen > 1e-10 && hermiteSpeed > 1e-10) {
        // Direction from surface normals, magnitude from Hermite parametrization
        const scale = hermiteSpeed / tangentLen;
        // Ensure direction matches Hermite direction
        let scaled = vec.mul(tangent, scale);
        if (vec.dot(scaled, hermiteDer) < 0) {
          vec._negate(scaled);
        }
        result[1] = scaled;
      } else {
        result[1] = hermiteDer;
      }
    }

    if (num >= 2) {
      result[2] = this.hermiteDer2(u);
    }

    return result;
  }

  param(point: Vec3): number {
    return this.closestParam(point);
  }

  knots(): number[] {
    return this.samples.map((_, i) => i);
  }

  transform(tr: Matrix3x4Data): ParametricCurve {
    throw new Error('Transform not supported for intersection curves');
  }

  invert(): ParametricCurve {
    return new InvertedCurve(this);
  }

  split(u: number): [ParametricCurve, ParametricCurve] {
    return BoundedCurve.splitCurve(this, u);
  }

  // --- Cubic Hermite interpolation ---

  private localizeParam(u: number): [number, number] {
    const n = this.samples.length;
    if (u >= n - 1) {
      return [n - 2, 1];
    }
    if (u <= 0) {
      return [0, 0];
    }
    const seg = Math.floor(u);
    return [seg, u - seg];
  }

  private hermitePoint(u: number): Vec3 {
    const [seg, t] = this.localizeParam(u);
    const p0 = this.samples[seg].point;
    const p1 = this.samples[seg + 1].point;
    const m0 = this._tangents[seg];
    const m1 = this._tangents[seg + 1];
    return hermiteBasis(p0, m0, p1, m1, t);
  }

  private hermiteDer1(u: number): Vec3 {
    const [seg, t] = this.localizeParam(u);
    const p0 = this.samples[seg].point;
    const p1 = this.samples[seg + 1].point;
    const m0 = this._tangents[seg];
    const m1 = this._tangents[seg + 1];
    return hermiteBasisDer1(p0, m0, p1, m1, t);
  }

  private hermiteDer2(u: number): Vec3 {
    const [seg, t] = this.localizeParam(u);
    const p0 = this.samples[seg].point;
    const p1 = this.samples[seg + 1].point;
    const m0 = this._tangents[seg];
    const m1 = this._tangents[seg + 1];
    return hermiteBasisDer2(p0, m0, p1, m1, t);
  }

  // --- Closest parameter search ---

  private closestParam(point: Vec3): number {
    const [uMin, uMax] = this.domain();

    // Coarse search: evaluate at regularly spaced points
    let bestU = uMin;
    let bestDist = Infinity;

    const steps = Math.max(this.samples.length * 4, 20);
    const step = (uMax - uMin) / steps;

    for (let i = 0; i <= steps; i++) {
      const u = uMin + i * step;
      const p = this.hermitePoint(u);
      const d = vec.distanceSq(p, point);
      if (d < bestDist) {
        bestDist = d;
        bestU = u;
      }
    }

    // Refine with Newton iterations on |C(u) - P|^2
    for (let iter = 0; iter < 10; iter++) {
      const clampedU = Math.max(uMin, Math.min(uMax, bestU));
      const [seg, t] = this.localizeParam(clampedU);
      const p0 = this.samples[seg].point;
      const p1 = this.samples[seg + 1].point;
      const m0 = this._tangents[seg];
      const m1 = this._tangents[seg + 1];

      const f = hermiteBasis(p0, m0, p1, m1, t);
      const d1 = hermiteBasisDer1(p0, m0, p1, m1, t);
      const d2 = hermiteBasisDer2(p0, m0, p1, m1, t);

      const diff = vec.sub(f, point);
      const g = vec.dot(diff, d1);
      const dg = vec.dot(d1, d1) + vec.dot(diff, d2);

      if (Math.abs(dg) < 1e-15) break;

      const du = -g / dg;
      bestU = Math.max(uMin, Math.min(uMax, clampedU + du));

      if (Math.abs(du) < 1e-10) break;
    }

    return bestU;
  }
}

// --- Hermite basis functions ---
// H(t) = h00*p0 + h10*m0 + h01*p1 + h11*m1

function hermiteBasis(p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return [
    h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
    h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
    h00 * p0[2] + h10 * m0[2] + h01 * p1[2] + h11 * m1[2],
  ] as Vec3;
}

function hermiteBasisDer1(p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;
  return [
    dh00 * p0[0] + dh10 * m0[0] + dh01 * p1[0] + dh11 * m1[0],
    dh00 * p0[1] + dh10 * m0[1] + dh01 * p1[1] + dh11 * m1[1],
    dh00 * p0[2] + dh10 * m0[2] + dh01 * p1[2] + dh11 * m1[2],
  ] as Vec3;
}

function hermiteBasisDer2(p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, t: number): Vec3 {
  const ddh00 = 12 * t - 6;
  const ddh10 = 6 * t - 4;
  const ddh01 = -12 * t + 6;
  const ddh11 = 6 * t - 2;
  return [
    ddh00 * p0[0] + ddh10 * m0[0] + ddh01 * p1[0] + ddh11 * m1[0],
    ddh00 * p0[1] + ddh10 * m0[1] + ddh01 * p1[1] + ddh11 * m1[1],
    ddh00 * p0[2] + ddh10 * m0[2] + ddh01 * p1[2] + ddh11 * m1[2],
  ] as Vec3;
}

// --- Newton refinement for surface-surface intersection ---

export function refineIntersectionPoint(
  surfA: ParametricSurface,
  surfB: ParametricSurface,
  uvA: UV,
  uvB: UV,
  tol: number = 1e-6,
  maxIter: number = 20
): IntersectionSample {
  let uA = uvA[0], vA = uvA[1];
  let uB = uvB[0], vB = uvB[1];

  for (let iter = 0; iter < maxIter; iter++) {
    const pA = surfA.point(uA, vA);
    const pB = surfB.point(uB, vB);
    const diff = vec.sub(pA, pB);
    const distSq = vec.lengthSq(diff);

    if (distSq < tol * tol) {
      return {point: pA, uvA: [uA, vA], uvB: [uB, vB]};
    }

    // Get surface derivatives for Newton step
    // eval returns Vec3[][] but is typed as number[][] in the interface
    const dA = surfA.eval(uA, vA, 1) as unknown as Vec3[][];
    const dB = surfB.eval(uB, vB, 1) as unknown as Vec3[][];

    // dA[1][0] = dSA/du, dA[0][1] = dSA/dv
    // dB[1][0] = dSB/du, dB[0][1] = dSB/dv
    const duA: Vec3 = dA[1][0];
    const dvA: Vec3 = dA[0][1];
    const duB: Vec3 = dB[1][0];
    const dvB: Vec3 = dB[0][1];

    // Solve 3x4 system: [duA, dvA, -duB, -dvB] * [delta_uA, delta_vA, delta_uB, delta_vB]^T = pB - pA
    // Using the approach: project residual onto each surface's tangent plane independently
    // For surface A: find delta_uvA such that pA + duA*delta_uA + dvA*delta_vA = target
    // For surface B: find delta_uvB such that pB + duB*delta_uB + dvB*delta_vB = target
    // where target = (pA + pB) / 2

    const target = vec.mul(vec.add(pA, pB), 0.5);
    const rA = vec.sub(target, pA);
    const rB = vec.sub(target, pB);

    // Solve 2x2 system for surface A: [duA·duA, duA·dvA; dvA·duA, dvA·dvA] * [δuA, δvA] = [duA·rA, dvA·rA]
    const a11 = vec.dot(duA, duA);
    const a12 = vec.dot(duA, dvA);
    const a22 = vec.dot(dvA, dvA);
    const b1A = vec.dot(duA, rA);
    const b2A = vec.dot(dvA, rA);
    const detA = a11 * a22 - a12 * a12;

    if (Math.abs(detA) > 1e-20) {
      uA += (a22 * b1A - a12 * b2A) / detA;
      vA += (a11 * b2A - a12 * b1A) / detA;
    }

    // Solve 2x2 system for surface B
    const c11 = vec.dot(duB, duB);
    const c12 = vec.dot(duB, dvB);
    const c22 = vec.dot(dvB, dvB);
    const b1B = vec.dot(duB, rB);
    const b2B = vec.dot(dvB, rB);
    const detB = c11 * c22 - c12 * c12;

    if (Math.abs(detB) > 1e-20) {
      uB += (c22 * b1B - c12 * b2B) / detB;
      vB += (c11 * b2B - c12 * b1B) / detB;
    }
  }

  // Return best result even if not fully converged
  const pA = surfA.point(uA, vA);
  return {point: pA, uvA: [uA, vA], uvB: [uB, vB]};
}

// --- Tessellation of arbitrary parametric surface for mesh intersection ---

export interface SurfaceMesh {
  points: Vec3[];
  uvs: [number, number][];
  normals: Vec3[];
  faces: [number, number, number][];
}

export function tessellateSurface(surface: ParametricSurface, nu: number = 20, nv: number = 20): SurfaceMesh {
  const points: Vec3[] = [];
  const uvs: [number, number][] = [];
  const normals: Vec3[] = [];
  const faces: [number, number, number][] = [];

  const [uMin, uMax] = surface.domainU;
  const [vMin, vMax] = surface.domainV;

  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const u = uMin + (uMax - uMin) * i / nu;
      const v = vMin + (vMax - vMin) * j / nv;
      const pt = surface.point(u, v);

      // Guard against NaN from degenerate surface regions
      if (Number.isNaN(pt[0]) || Number.isNaN(pt[1]) || Number.isNaN(pt[2])) {
        points.push(surface.point(
          uMin + (uMax - uMin) * Math.max(0.01, Math.min(0.99, i / nu)),
          vMin + (vMax - vMin) * Math.max(0.01, Math.min(0.99, j / nv))
        ));
      } else {
        points.push(pt);
      }
      uvs.push([u, v]);
      normals.push(surface.normal(u, v));
    }
  }

  const cols = nv + 1;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const idx = i * cols + j;
      faces.push([idx, idx + 1, idx + cols]);
      faces.push([idx + 1, idx + cols + 1, idx + cols]);
    }
  }

  return {points, uvs, normals, faces};
}
