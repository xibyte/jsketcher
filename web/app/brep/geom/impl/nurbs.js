import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'
import {Surface} from "../surface";
import Vector from "../../../math/vector";
import * as ext from "./nurbs-ext";
import {EPSILON, eqEps, TOLERANCE} from "../tolerance";
import curveIntersect from "./curve/curves-isec";
import curveTess from "./curve/curve-tess";
import {areEqual} from "../../../math/math";


class ParametricCurve {

  domain() { }

  degree() { }

  degree1Tess() {}

  eval(u, num) { }

  point(param) { }

  param(point) { }

  transform(tr) { }

  optimalSplits() { }

  normalizeParametrization() { }

  invert() { }
}

export class NurbsCurveImpl { //TODO: rename to NurbsCurve implements ParametricCurve

  constructor(verbCurve) {
    this.verb = verbCurve;
    this.data = verbCurve.asNurbs();
  }

  domain() {
    return ext.curveDomain(this.data);
  }

  degree1Tess() {
    return ext.distinctKnots(this.data);
  }

  degree() {
    return this.data.degree;
  }

  transform(tr) {
    return new NurbsCurveImpl(this.verb.transform(tr));
  }

  point(u) {
    return this.verb.point(u);
  }

  param(point) {
    return this.verb.closestParam(point);
  }

  eval(u, num) {
    return verb.eval.Eval.rationalCurveDerivatives( this.data, u, num );
  }

  optimalSplits() {
    return this.data.knots.length - 1;
  }

  invert() {

    let inverted = ext.curveInvert(this.data);
    ext.normalizeCurveParametrizationIfNeeded(inverted);
    // let [min, max] = curveDomain(curve);
    // for (let i = 0; i < reversed.knots.length; i++) {
    //   if (eqEps(reversed.knots[i], max)) {
    //     reversed.knots[i] = max;
    //   } else {
    //     break;
    //   }
    // }
    // for (let i = reversed.knots.length - 1; i >= 0 ; i--) {
    //   if (eqEps(reversed.knots[i], min)) {
    //     reversed.knots[i] = min;
    //   } else {
    //     break;
    //   }
    // }

    return new NurbsCurveImpl(newVerbCurve(inverted));
  }

  split(u) {
    let split = verb.eval.Divide.curveSplit(this.data, u);
    split.forEach(n => ext.normalizeCurveParametrization(n));
    return split.map(c => new NurbsCurveImpl(newVerbCurve(c)));
  }
}

export class NurbsCurve { //TODO: rename to BrepCurve

  constructor(_impl, uMin, uMax) {
    let [iMin, iMax] = _impl.domain();
    if (iMin !== 0 || iMax !== 1) {
      throw 'only normalized(0..1) parametrization is supported';
    }
    this.impl = _impl;
    // if (uMin === undefined || uMax === undefined) {
    //   [uMin, uMax] = this.impl.domain();
    // }
    // this.uMin = uMin;
    // this.uMax = uMax;
    this.uMin = 0;
    this.uMax = 1;
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z);
    return new NurbsCurve(this.impl.transform(tr.toArray()), this.uMin, this.uMax);
  }

  tangentAtPoint(point) {
    let u = this.impl.param(point.data());
    if (areEqual(u, this.uMax, 1e-3)) { // we don't need much tolerance here
      //TODO:
      // let cps = this.impl.data.controlPoints;
      // return pt(cps[cps.length - 1])._minus(pt(cps[cps.length - 2]))._normalize();
      u -= 1e-3;
    }
    return this.tangentAtParam(u);
  }

  tangentAtParam(u) {
    const dr = this.impl.eval(u, 1);
    return pt(dr[1])._normalize();
  }

  param(point) {
    return this.impl.param(point.data());
  }

  split(point) {
    return this.splitByParam(this.param(point));
  }

  splitByParam(u) {
    if (u < this.uMin || u > this.uMax) {
      throw 'illegal splitting parameter ' + u;
    }
    let split = this.impl.split(u);

    const splitCheck = (split) => {
      return (
        math.equal(this.impl.param(split[0].point(1)), this.impl.param(split[1].point(0))) &&
        math.equal(this.impl.param(split[0].point(0)), 0) &&
        math.equal(this.impl.param(split[0].point(1)), u) &&
        math.equal(this.impl.param(split[1].point(0)), u) &&
        math.equal(this.impl.param(split[1].point(1)), 1)
      )
    };
    if (!splitCheck(split)) {
      throw 'wrong split';
    }
    return split.map(v => new NurbsCurve(v));

    // return [
    //   new NurbsCurve(this.impl, this.uMin, u),
    //   new NurbsCurve(this.impl, u, this.uMax)
    // ];
  }

  point(u) {
    return pt(this.impl.point(u));
  }

  tessellate(tessTol, scale) {
    return CURVE_CACHING_TESSELLATOR(this.impl, this.uMin, this.uMax, tessTol, scale).map(p => pt(p));
  }

  boundary() {
    return [this.uMin, this.uMax];
  }

  intersectCurve(other) {
    let isecs = [];

    const eq = (v1, v2) => math.areVectorsEqual3(v1, v2, TOLERANCE);

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
      CURVE_CACHING_TESSELLATOR, CURVE_CACHING_TESSELLATOR
    ).forEach(i => add(i));

    isecs.forEach(i => {
      i.p0 = pt(i.p0);
      i.p1 = pt(i.p1);
    });
    isecs = isecs.filter(({u0, u1}) => {
      let collinearFactor = Math.abs(this.tangentAtParam(u0).dot(other.tangentAtParam(u1)));
      return !math.areEqual(collinearFactor, 1);
    });
    return isecs;
  }

  isInside(u) {
    return  u >= this.uMin && u <= this.uMax;
  }

  invert() {
    return new NurbsCurve(this.impl.invert());
  }
}

const CURVE_CACHING_TESSELLATOR = function(curve, min, max, tessTol, scale) {
  return cache('tess', [min, max, tessTol, scale], curve, () => degree1OptTessellator(curve, min, max, tessTol, scale));
};

function degree1OptTessellator(curve, min, max, tessTol, scale) {
  if (curve.degree() === 1) {
    return curve.degree1Tess().map(u => curve.point(u));
  }
  return curveTess(curve, min, max, tessTol, scale);
}

NurbsCurve.createLinearNurbs = function(a, b) {
  return new NurbsCurve(new NurbsCurveImpl(new verb.geom.Line(a.data(), b.data())));
};

export class NurbsSurface extends Surface {

  constructor(verbSurface, inverted) {
    super();
    this.data = verbSurface.asNurbs();
    this.verb = verbSurface;
    this.inverted = inverted === true;
    this.mirrored = NurbsSurface.isMirrored(this);
  }

  toNurbs() {
    return this;
  }

  normal(point) {
    let uv = this.verb.closestParam(point.data());
    let normal = pt(this.verb.normal(uv[0], uv[1]));
    if (this.inverted) {
      normal._negate();
    }
    normal._normalize();
    return normal;
  }

  normalUV(u, v) {
    let normal = pt(this.verb.normal(u, v));
    if (this.inverted) {
      normal._negate();
    }
    normal._normalize();
    return normal;
  }

  normalInMiddle() {
    //TODO: use domain!
    return this.normalUV(0.5, 0.5);
  }

  point(u, v) {
    return pt(this.verb.point(u, v));
  }

  workingPoint(point) {
    return this.createWorkingPoint(this.verb.closestParam(point.data()), point);
  }

  createWorkingPoint(uv, pt3d) {
    const wp = new Vector(uv[0], uv[1], 0)._multiply(NurbsSurface.WORKING_POINT_SCALE_FACTOR);
    if (this.mirrored) {
      wp.x *= -1;
    }
    wp.__3D = pt3d;
    return wp;
  }

  workingPointTo3D(wp) {
    if (wp.__3D === undefined) {
      const uv = wp.multiply(NurbsSurface.WORKING_POINT_UNSCALE_FACTOR);
      if (this.mirrored) {
        uv.x *= -1;
      }
      wp.__3D = this.point(uv.x, uv.y);
    }
    return wp.__3D;
  }

  static isMirrored(surface) {
    //TODO: use domain!
    let a = surface.point(0, 0);
    let b = surface.point(1, 0);
    let c = surface.point(1, 1);
    return b.minus(a).cross(c.minus(a))._normalize().dot(surface.normalUV(0, 0)) < 0;
  }

  intersectSurfaceForSameClass(other, tol) {
    let curves = ext.surfaceIntersect(this.data, other.data, tol);
    let inverted = this.inverted !== other.inverted;
    if (inverted) {
      curves = curves.map(curve => ext.curveInvert(curve));
    }
    curves.forEach(curve => ext.normalizeCurveParametrizationIfNeeded(curve))
    return curves.map(curve => new NurbsCurve(new NurbsCurveImpl(newVerbCurve(curve))));
  }

  invert() {
    return new NurbsSurface(this.verb, !this.inverted);
  }

  isoCurve(param, useV) {
    const data = verb.eval.Make.surfaceIsocurve(this.verb._data, param, useV);
    const isoCurve = newVerbCurve(data);
    return new NurbsCurve(new NurbsCurveImpl(isoCurve));
  }

  isoCurveAlignU(param) {
    return this.isoCurve(param, true);
  }

  isoCurveAlignV(param) {
    return this.isoCurve(param, false);
  }
}

NurbsSurface.WORKING_POINT_SCALE_FACTOR = 1000;
NurbsSurface.WORKING_POINT_UNSCALE_FACTOR = 1 / NurbsSurface.WORKING_POINT_SCALE_FACTOR;

NurbsSurface.loft = function(curve1, curve2) {
  return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve1.impl.verb, curve2.impl.verb], 1));
};

function newVerbCurve(data) {
  return new verb.geom.NurbsCurve(data);
}

function pt(data) {
  return new Point().set3(data);
}

function cache(id, keys, obj, op) {
  id = '__cache__:' + id + ':' + keys.join('/');
  if (!obj[id]) {
    obj[id] = op();
  }
  return obj[id];
}

const surTess = verb.eval.Tess.rationalSurfaceAdaptive;
verb.eval.Tess.rationalSurfaceAdaptive = function(surface, opts) {
  const keys = [opts ? opts.maxDepth: 'undefined'];
  return cache('tess', keys, surface, () => surTess(surface, opts));
}
