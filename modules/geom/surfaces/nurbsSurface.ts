import {distinctKnots} from '../impl/nurbs-ext';
import cache from '../impl/cache';
import * as ext from '../impl/nurbs-ext';
import NurbsCurve from '../curves/nurbsCurve';
import {ParametricSurface, UV} from "./parametricSurface";
import {ParametricCurve} from "../curves/parametricCurve";
import {Matrix3x4Data} from "math/matrix";
import {Vec3} from "math/vec";
import {NurbsSurfaceData} from "geom/surfaces/nurbsSurfaceData";
import {SurfaceBSplineData} from "engine/data/surfaceData";

export default class NurbsSurface implements ParametricSurface {

  data: NurbsSurfaceData;
  verb: any;
  domainU: [number, number];
  domainV: [number, number];
  knotsU: number[];
  knotsV: number[];

  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  isMirrored: boolean;

  static create(degU: number, degV: number, knotsU: number[], knotsV: number[], controlPoints: number[][], weights: number[][]): NurbsSurface {
    return new NurbsSurface(
      verb.geom.NurbsSurface.byKnotsControlPointsWeights(degU, degV, knotsU, knotsV, controlPoints, weights));
  }
  
  constructor(verbSurface) {
    this.data = verbSurface.asNurbs();
    this.verb = verbSurface;

    const {min: uMin, max: uMax} = verbSurface.domainU();
    const {min: vMin, max: vMax} = verbSurface.domainV();

    this.uMin = uMin;
    this.uMax = uMax;
    this.vMin = vMin;
    this.vMax = vMax;

    this.domainU = [uMin, uMax];
    this.domainV = [vMin, vMax];
    this.knotsU = distinctKnots(this.verb.knotsU());
    this.knotsV = distinctKnots(this.verb.knotsV());
  }
  
  degreeU(): number {
    return this.verb.degreeU();
  }

  degreeV(): number {
    return this.verb.degreeV();
  }

  param(point): UV {
    return this.verb.closestParam(point);
  }

  point(u, v): Vec3 {
    return this.verb.point(u, v);
  }

  eval(u: number, v: number, order: number) {
    return this.verb.derivatives(u, v, order);
  }
  
  normal(u: number, v: number): Vec3 {
    return this.verb.normal(u, v);
  }

  isoCurve(param, useV): ParametricCurve {
    const data = verb.eval.Make.surfaceIsocurve(this.data, param, useV);
    const isoCurve = new verb.geom.NurbsCurve(data);
    return new NurbsCurve(isoCurve);
  }

  static loft(curve1, curve2): NurbsSurface {
    return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve1.impl.verb, curve2.impl.verb], 1));
  }

  transform(tr: Matrix3x4Data): ParametricSurface {
    return new NurbsSurface(this.verb.transform(tr));
  }

  asSurfaceBSplineData(): SurfaceBSplineData {
    return {
      TYPE: "B-SPLINE",
      degreeU: this.verb.degreeU(),
      degreeV: this.verb.degreeV(),
      knotsU: this.verb.knotsU(),
      knotsV: this.verb.knotsV(),
      weights: this.verb.weights(),
      cp: this.verb.controlPoints()
    }
  }
}

const surTess = verb.eval.Tess.rationalSurfaceAdaptive;
verb.eval.Tess.rationalSurfaceAdaptive = function(surface, opts) {
  const keys = [opts ? opts.maxDepth: 'undefined'];
  return cache('tess', keys, surface, () => surTess(surface, opts));
};


export function intersectNurbs(a, b, inverted) {
  let curves = ext.surfaceIntersect(a.data, b.data);
  if (inverted) {
    curves = curves.map(curve => ext.curveInvert(curve));
  }
  curves.forEach(curve => ext.normalizeCurveParametrizationIfNeeded(curve));
  return curves.map(curve => new NurbsCurve(new verb.geom.NurbsCurve(curve)));
}
