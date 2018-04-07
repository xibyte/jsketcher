import {Point} from '../point';
import Vector from 'math/vector';
import {Plane} from '../impl/plane';
import BrepCurve from '../curves/brepCurve';
import NurbsCurve from '../curves/nurbsCurve';
import {surfaceIntersect} from '../intersection/surfaceSurface';
import {intersectNurbs} from './nurbsSurface';

export class BrepSurface {

  constructor(surface, inverted, simpleSurface) {
    this.impl = surface;
    let [uMin, uMax] = surface.domainU;
    let [vMin, vMax] = surface.domainV;

    Object.assign(this, {
      uMin, uMax, vMin, vMax,
      uMid: (uMax - uMin) * 0.5,
      vMid: (vMax - vMin) * 0.5
    });

    this.inverted = inverted === true;
    this.mirrored = BrepSurface.isMirrored(this);
    this.simpleSurface = simpleSurface || figureOutSimpleSurface(this);
  }

  normal(point) {
    let uv = this.impl.param(point.data());
    let normal = pt(this.impl.normal(uv[0], uv[1]));
    if (this.inverted) {
      normal._negate();
    }
    normal._normalize();
    return normal;
  }

  normalUV(u, v) {
    let normal = pt(this.impl.normal(u, v));
    if (this.inverted) {
      normal._negate();
    }
    normal._normalize();
    return normal;
  }

  normalInMiddle() {
    return this.normalUV(this.uMid, this.vMid);
  }

  pointInMiddle() {
    return this.point(this.uMid, this.vMid);
  }

  southWestPoint() {
    return this.point(this.uMin, this.vMin);
  }

  southEastPoint() {
    return this.point(this.uMax, this.vMin);
  }

  northEastPoint() {
    return this.point(this.uMax, this.vMax);
  }

  northWestPoint() {
    return this.point(this.uMin, this.vMax);
  }

  param(point) {
    return this.impl.param(point.data());
  }

  point(u, v) {
    return pt(this.impl.point(u, v));
  }

  workingPoint(point) {
    return this.createWorkingPoint(this.impl.param(point.data()), point);
  }

  createWorkingPoint(uv, pt3d) {
    const wp = new Vector(uv[0], uv[1], 0)._multiply(BrepSurface.WORKING_POINT_SCALE_FACTOR);
    if (this.mirrored) {
      wp.x *= -1;
    }
    wp.__3D = pt3d;
    return wp;
  }

  workingPointTo3D(wp) {
    if (wp.__3D === undefined) {
      const uv = wp.multiply(BrepSurface.WORKING_POINT_UNSCALE_FACTOR);
      if (this.mirrored) {
        uv.x *= -1;
      }
      wp.__3D = this.point(uv.x, uv.y);
    }
    return wp.__3D;
  }

  static isMirrored(surface) {

    let x = surface.isoCurveAlignU(surface.uMin).tangentAtParam(surface.uMin);
    let y = surface.isoCurveAlignV(surface.vMin).tangentAtParam(surface.vMin);

    return x.cross(y).dot(surface.normalUV(surface.uMin, surface.vMin)) < 0;
  }

  intersectSurface(other, tol) {
    let X = intersectNurbs(this.impl, other.impl, this.inverted !== other.inverted);
    // let X = surfaceIntersect(this.impl, other.impl);
    return X.map(curve => new BrepCurve(curve));
  };

  invert() {
    return new BrepSurface(this.impl, !this.inverted);
  }

  isoCurve(param, useV) {
    const data = verb.eval.Make.surfaceIsocurve(this.impl.verb._data, param, useV);
    const isoCurve = new verb.geom.NurbsCurve(data);
    return new BrepCurve(new NurbsCurve(isoCurve));
  }

  isoCurveAlignU(param) {
    return this.isoCurve(param, true);
  }

  isoCurveAlignV(param) {
    return this.isoCurve(param, false);
  }

  tangentPlane(u, v) {
    let normal = this.normalUV(u, v);
    return new Plane(normal, normal.dot(this.point(u, v)));
  }

  tangentPlaneInMiddle() {
    return this.tangentPlane(this.uMid, this.vMid);
  }
}

BrepSurface.WORKING_POINT_SCALE_FACTOR = 1000;
BrepSurface.WORKING_POINT_UNSCALE_FACTOR = 1 / BrepSurface.WORKING_POINT_SCALE_FACTOR;

function pt(data) {
  return new Point().set3(data);
}

function figureOutSimpleSurface(srf) {
  if (Math.max(srf.impl.degreeU(), srf.impl.degreeV()) === 1) {
    return srf.tangentPlane(srf.uMid, srf.vMid);
  }
  return null;
}
