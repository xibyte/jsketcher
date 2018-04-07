import BoundedCurve from './boundedCurve';

export class IsoCurveU {

  constructor(surface, u) {
    this.surface = surface;
    this.u = u;
  }

  domain() {
    return [this.surface.vMin, this.surface.vMax];
  }

  transform() {
    throw 'unsupported';
  }

  point(u) {
    return this.surface.point(this.u, u);
  }

  param(point) {
    return this.surface.param(point)[1];
  }

  eval(u, num) {
    let hes = this.surface.eval(this.u, u, num);
    let out = [];
    for (let i = 0; i < num; ++i) {
      out[i] = hes[i][0];
    }
    return out;
  }

  knots() {
    return this.curve.knots();
  }

  invert() {
    return this.curve;
  }

  split(u) {
    return BoundedCurve.splitCurve(this, u);
  }
}
