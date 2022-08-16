import {Point} from '../point';
import Vector, {UnitVector} from 'math/vector';
import {Plane} from '../impl/plane';
import BrepCurve from '../curves/brepCurve';
import {intersectNurbs} from './nurbsSurface';
import {IsoCurveU, IsoCurveV} from '../curves/IsoCurve';
import {ParametricSurface, UV} from "./parametricSurface";
import {Matrix3x4} from "math/matrix";

export class BrepSurface {

  impl: ParametricSurface;
  inverted: boolean;

  private _simpleSurface: Plane;
  private _mirrored: boolean;

  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;

  uMid: number;
  vMid: number;

  constructor(surface: ParametricSurface, inverted?: boolean) {
    this.impl = surface;
    const [uMin, uMax] = surface.domainU;
    const [vMin, vMax] = surface.domainV;

    Object.assign(this, {
      uMin, uMax, vMin, vMax,
      uMid: (uMax - uMin) * 0.5,
      vMid: (vMax - vMin) * 0.5
    });

    this.inverted = inverted === true;
  }

  get simpleSurface() {
    return this._simpleSurface || (this._simpleSurface = figureOutSimpleSurface(this));
  }

  get mirrored() {
    return this._mirrored || (this._mirrored = BrepSurface.isMirrored(this));
  }

  normal(point: Vector): Vector {
    const uv = this.impl.param(point.data());
    const normal = pt(this.impl.normal(uv[0], uv[1]));
    if (this.inverted) {
      normal._negate();
    }
    normal._normalize();
    return normal;
  }

  normalUV(u: number, v: number): UnitVector {
    const normal = pt(this.impl.normal(u, v));
    if (this.inverted) {
      normal._negate();
    }
    return normal._normalize();
  }

  normalInMiddle(): Vector {
    return this.normalUV(this.uMid, this.vMid);
  }

  pointInMiddle(): Vector {
    return this.point(this.uMid, this.vMid);
  }

  southWestPoint(): Vector {
    return this.point(this.uMin, this.vMin);
  }

  southEastPoint(): Vector {
    return this.point(this.uMax, this.vMin);
  }

  northEastPoint(): Vector {
    return this.point(this.uMax, this.vMax);
  }

  northWestPoint(): Vector {
    return this.point(this.uMin, this.vMax);
  }

  param(point) {
    return this.impl.param(point.data());
  }

  point(u: number, v: number): Vector {
    return pt(this.impl.point(u, v));
  }

  workingPoint(point: Vector): Vector {
    return this.createWorkingPoint(this.impl.param(point.data()), point);
  }

  createWorkingPoint(uv: UV, pt3d: Vector): Vector {
    const wp = new Vector(uv[0], uv[1], 0)._multiply(BrepSurface.WORKING_POINT_SCALE_FACTOR);
    if (this.mirrored) {
      wp.x *= -1;
    }
    wp.__3D = pt3d;
    return wp;
  }

  workingPointTo3D(wp: Vector): Vector {
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
    if (surface.impl.isMirrored !== undefined) {
      return surface.impl.isMirrored;
    }
    
    const x = surface.isoCurveAlignU(surface.uMin).tangentAtParam(surface.uMin);
    const y = surface.isoCurveAlignV(surface.vMin).tangentAtParam(surface.vMin);

    return x.cross(y).dot(surface.normalUV(surface.uMin, surface.vMin)) < 0;
  }

  intersectSurface(other, tol) {
    const X = intersectNurbs(this.impl, other.impl, this.inverted !== other.inverted);
    // let X = surfaceIntersect(this.impl, other.impl);
    return X.map(curve => new BrepCurve(curve));
  }

  invert() {
    return new BrepSurface(this.impl, !this.inverted);
  }

  isoCurve(param, useV) {
    let isoCurve;
    // @ts-ignore
    if (this.impl.isoCurve) {
      // @ts-ignore
      isoCurve = this.impl.isoCurve(param, useV);
    } else {
      isoCurve = useV ?  new IsoCurveV(this.impl, param) : new IsoCurveU(this.impl, param);
    }
    return new BrepCurve(isoCurve);
  }

  isoCurveAlignU(param) {
    return this.isoCurve(param, true);
  }

  isoCurveAlignV(param) {
    return this.isoCurve(param, false);
  }

  tangentPlane(u, v) {
    const normal = this.normalUV(u, v);
    return new Plane(normal, normal.dot(this.point(u, v)));
  }

  tangentPlaneInMiddle() {
    return this.tangentPlane(this.uMid, this.vMid);
  }

  transform(tr: Matrix3x4): BrepSurface {
    const trArr = tr.toArray();
    // trArr.push([0, 0, 0, 1]);
    return new BrepSurface(this.impl.transform(trArr), this.inverted);
  }

  static WORKING_POINT_SCALE_FACTOR = 1000;

  static WORKING_POINT_UNSCALE_FACTOR = 1 / BrepSurface.WORKING_POINT_SCALE_FACTOR;

}


function pt(data) {
  return new Point().set3(data);
}

function figureOutSimpleSurface(srf) {
  if (Math.max(srf.impl.degreeU(), srf.impl.degreeV()) === 1) {
    return srf.tangentPlane(srf.uMid, srf.vMid);
  }
  return null;
}

declare module 'math/vector' {
  export default interface Vector {

    __3D: Vector;
  }
}
