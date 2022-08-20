import BoundedCurve from './boundedCurve';
import InvertedCurve from './invertedCurve';
import {ParametricSurface} from "../surfaces/parametricSurface";
import {ParametricCurve} from "./parametricCurve";
import {Matrix3x4Data} from "math/matrix";

export class IsoCurveU implements ParametricCurve {

  surface: ParametricSurface;
  u: number;

  constructor(surface, u) {
    this.surface = surface;
    this.u = u;
  }

  domain(): [number, number] {
    return [this.surface.vMin, this.surface.vMax];
  }

  transform(tr: Matrix3x4Data): ParametricCurve {
    throw 'unsupported';
  }

  point(u) {
    return this.surface.point(this.u, u);
  }

  param(point) {
    return this.surface.param(point)[1];
  }

  eval(u, num) {
    const hes = this.surface.eval(this.u, u, num);
    const out = [];
    for (let i = 0; i < num; ++i) {
      out[i] = hes[i][0];
    }
    return out;
  }

  knots() {
    return this.surface.knotsV;
  }

  invert() {
    return new InvertedCurve(this);
  }

  split(u): [ParametricCurve, ParametricCurve] {
    return BoundedCurve.splitCurve(this, u);
  }

  degree(): number {
    return this.surface.degreeV();
  }

}

export class IsoCurveV implements ParametricCurve {

  surface: ParametricSurface;
  v: number;

  constructor(surface, v) {
    this.surface = surface;
    this.v = v;
  }

  domain(): [number, number] {
    return [this.surface.uMin, this.surface.uMax];
  }

  transform(tr: Matrix3x4Data): ParametricCurve {
    throw 'unsupported';
  }

  point(u) {
    return this.surface.point(u, this.v);
  }

  param(point) {
    return this.surface.param(point)[0];
  }

  eval(u, num) {
    const hes = this.surface.eval(u, this.v, num);
    const out = [];
    for (let i = 0; i < num; ++i) {
      out[i] = hes[i][1];
    }
    return out;
  }

  knots() {
    return this.surface.knotsU;
  }

  invert() {
    return new InvertedCurve(this);
  }

  split(u): [ParametricCurve, ParametricCurve] {
    return BoundedCurve.splitCurve(this, u);
  }

  degree(): number {
    return this.surface.degreeU();
  }
}
