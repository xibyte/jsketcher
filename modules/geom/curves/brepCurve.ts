import NurbsCurve from "./nurbsCurve";

import {eqSqTol, ueq, veq, veq3, veqNeg} from "../tolerance";
import curveIntersect from "../impl/curve/curves-isec";
import curveTess from "../impl/curve/curve-tess";
import Point from 'math/vector';
import Vector from 'math/vector';
import cache from "../impl/cache";
import {Tessellation1D} from "engine/tessellation";
import {Matrix3x4} from "math/matrix";
import {areEqual} from "math/equality";
import {Vec3} from "math/vec";
import {ParametricCurve} from "geom/curves/parametricCurve";

export default class BrepCurve {

  impl: ParametricCurve;

  uMin: number;
  uMax: number;
  uMid: number;
  private __middlePoint: Vector;

  constructor(_impl: ParametricCurve, uMin?: number, uMax?: number) {
    this.impl = _impl;
    [uMin, uMax] = this.impl.domain();
    this.uMin = uMin;
    this.uMax = uMax;
    this.uMid = (uMax - uMin) * 0.5;
  }

  get degree(): number {
    return this.impl.degree();
  }
  
  translate(vector: Vector): BrepCurve {
    const tr = new Matrix3x4().translate(vector.x, vector.y, vector.z);
    return this.transform(tr);
  }

  transform(tr: Matrix3x4): BrepCurve {
    return new BrepCurve(this.impl.transform(tr.toArray()), this.uMin, this.uMax);
  }

  tangentAtPoint(point: Vector): Vector {
    let u = this.impl.param(point.data());
    if (areEqual(u, this.uMax, 1e-3)) { // we don't need much tolerance here
      //TODO:
      // let cps = this.impl.data.controlPoints;
      // return pt(cps[cps.length - 1])._minus(pt(cps[cps.length - 2]))._normalize();
      u -= 1e-3;
    }
    return this.tangentAtParam(u);
  }

  tangentAtParam(u: number) {
    const dr = this.impl.eval(u, 1);
    return pt(dr[1])._normalize();
  }

  param(point: Vector): number {
    return this.impl.param(point.data());
  }

  split(point: Vector): [BrepCurve, BrepCurve] {
    return this.splitByParam(this.param(point));
  }

  splitByParam(u: number): [BrepCurve, BrepCurve]  {
    if (ueq(u, this.uMin) || ueq(u, this.uMax) || u < this.uMin || u > this.uMax) {
      return null
    }
    let split = this.impl.split(u);
    return split.map(v => new BrepCurve(v)) as [BrepCurve, BrepCurve];

    // return [
    //   new BrepCurve(this.impl, this.uMin, u),
    //   new BrepCurve(this.impl, u, this.uMax)
    // ];
  }

  point(u: number): Vector {
    return pt(this.impl.point(u));
  }

  tessellateToData(tessTol: number, scale: number): Tessellation1D<Vec3> {
    return CURVE_CACHING_TESSELLATOR(this.impl, this.uMin, this.uMax, tessTol, scale);
  }

  tessellate(tessTol?: number, scale?: number): Tessellation1D<Vector> {
    return this.tessellateToData(tessTol, scale).map(p => pt(p));
  }

  boundary(): [number, number] {
    return [this.uMin, this.uMax];
  }

  intersectCurve(other) {
    let isecs = [];

    const eq = veq3;

    function add(i0) {
      for (let i1 of isecs) {
        if (eq(i0.p0, i1.p0)) {
          return;
        }
      }
      isecs.push(i0);
    }

    function isecOn(c0, c1, u0) {
      const p0 = c0.impl.point(u0);
      const u1 = c1.impl.param(p0);
      if (!c1.isInside(u1)) {
        return;
      }
      const p1 = c1.impl.point(u1);
      if (eq(p0, p1)) {
        if (c0 === other) {
          add({u0: u1, u1: u0, p0: p1, p1: p0});
        } else {
          add({u0, u1, p0, p1});
        }
      }
    }

    isecOn(this, other, this.uMin);
    isecOn(this, other, this.uMax);
    isecOn(other, this, other.uMin);
    isecOn(other, this, other.uMax);

    curveIntersect(
      this.impl, other.impl,
      this.boundary(), other.boundary(),
      CURVE_CACHING_TESSELLATOR
    ).forEach(i => add(i));

    isecs.forEach(i => {
      i.p0 = pt(i.p0);
      i.p1 = pt(i.p1);
    });
    isecs = isecs.filter(({u0, u1}) => {
      let t0 = this.tangentAtParam(u0);
      let t1 = other.tangentAtParam(u1);
      return !veq(t0, t1) && !veqNeg(t0, t1);
    });
    return isecs;
  }

  isInside(u: number): boolean {
    return  u >= this.uMin && u <= this.uMax;
  }

  invert(): BrepCurve {
    return new BrepCurve(this.impl.invert());
  }

  startPoint(): Vector {
    return this.point(this.uMin);
  }

  endPoint(): Vector {
    return this.point(this.uMax);
  }

  middlePoint(): Vector {
    return this.__middlePoint || (this.__middlePoint = this.point(this.uMid));
  }

  passesThrough(point: Vector): boolean {
    return eqSqTol(0, point.distanceToSquared(this.point(this.param(point))));
  }

  static createLinearCurve = function(a: Vector, b: Vector): BrepCurve {
    let line = verb.geom.NurbsCurve.byKnotsControlPointsWeights( 1, [0,0,1,1], [a.data(), b.data()]);
    return new BrepCurve(new NurbsCurve(line));
  };

}

function pt(data) {
  return new Point().set3(data);
}

const CURVE_CACHING_TESSELLATOR = function(curve, min, max, tessTol, scale) {
  return cache('tess', [min, max, tessTol, scale], curve, () => degree1OptTessellator(curve, min, max, tessTol, scale));
};

function degree1OptTessellator(curve, min, max, tessTol, scale) {
  if (curve.degree() === 1) {
    return curve.knots().map(u => curve.point(u));
  }
  return curveTess(curve, min, max, tessTol, scale);
}



