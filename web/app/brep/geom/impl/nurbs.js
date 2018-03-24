import {Point} from '../point';
import {Surface} from '../surface';
import Vector from 'math/vector';
import * as ext from './nurbs-ext';
import {Plane} from './plane';
import BrepCurve from '../curves/brepCurve';
import NurbsCurve from '../curves/nurbsCurve';
import cache from './cache';

export class NurbsSurface extends Surface {

  constructor(verbSurface, inverted, simpleSurface) {
    super();
    let {min: uMin, max: uMax} = verbSurface.domainU();
    let {min: vMin, max: vMax} = verbSurface.domainV();

    Object.assign(this, {
      uMin, uMax, vMin, vMax,
      uMid: (uMax - uMin) * 0.5,
      vMid: (vMax - vMin) * 0.5
    });
    
    this.data = verbSurface.asNurbs();
    this.verb = verbSurface;
    this.inverted = inverted === true;
    this.mirrored = NurbsSurface.isMirrored(this);
    this.simpleSurface = simpleSurface || figureOutSimpleSurface(this); 
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
    return this.verb.closestParam(point.data());
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

    let x = surface.isoCurveAlignU(surface.uMin).tangentAtParam(surface.uMin);
    let y = surface.isoCurveAlignV(surface.vMin).tangentAtParam(surface.vMin);

    return x.cross(y).dot(surface.normalUV(surface.uMin, surface.vMin)) < 0;
  }

  intersectSurfaceForSameClass(other) {
    let curves = ext.surfaceIntersect(this.data, other.data);
    let inverted = this.inverted !== other.inverted;
    if (inverted) {
      curves = curves.map(curve => ext.curveInvert(curve));
    }
    curves.forEach(curve => ext.normalizeCurveParametrizationIfNeeded(curve));
    return curves.map(curve => new BrepCurve(new NurbsCurve(newVerbCurve(curve))));
  }

  invert() {
    return new NurbsSurface(this.verb, !this.inverted);
  }

  isoCurve(param, useV) {
    const data = verb.eval.Make.surfaceIsocurve(this.verb._data, param, useV);
    const isoCurve = newVerbCurve(data);
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

NurbsSurface.WORKING_POINT_SCALE_FACTOR = 1000;
NurbsSurface.WORKING_POINT_UNSCALE_FACTOR = 1 / NurbsSurface.WORKING_POINT_SCALE_FACTOR;

NurbsSurface.loft = function(curve1, curve2) {
  return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve1.impl.verb, curve2.impl.verb], 1));
};

export function newVerbCurve(data) {
  return new verb.geom.NurbsCurve(data);
}

function pt(data) {
  return new Point().set3(data);
}

const surTess = verb.eval.Tess.rationalSurfaceAdaptive;
verb.eval.Tess.rationalSurfaceAdaptive = function(surface, opts) {
  const keys = [opts ? opts.maxDepth: 'undefined'];
  return cache('tess', keys, surface, () => surTess(surface, opts));
};

function figureOutSimpleSurface(nurbs) {
  if (ext.surfaceMaxDegree(nurbs.data) === 1) {
    return nurbs.tangentPlane(nurbs.uMid, nurbs.vMid);    
  }
  return null;
}