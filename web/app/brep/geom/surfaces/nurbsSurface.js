import {distinctKnots} from '../impl/nurbs-ext';
import cache from '../impl/cache';
import * as ext from '../impl/nurbs-ext';
import NurbsCurve from '../curves/nurbsCurve';

export default class NurbsSurface {
  
  constructor(verbSurface) {
    this.data = verbSurface.asNurbs();
    this.verb = verbSurface;

    let {min: uMin, max: uMax} = verbSurface.domainU();
    let {min: vMin, max: vMax} = verbSurface.domainV();

    this.domainU = [uMin, uMax];
    this.domainV = [vMin, vMax];
    this.knotsU = distinctKnots(this.verb.knotsU());
    this.knotsV = distinctKnots(this.verb.knotsV());
  }
  
  degreeU() {
    return this.verb.degreeU();
  }

  degreeV() {
    return this.verb.degreeV();
  }

  param(point) {
    return this.verb.closestParam(point);
  }

  point(u, v) {
    return this.verb.point(u, v);
  }

  eval(u, v, order) {
    this.verb.derivatives(u, v, order);
  }
  
  normal(u, v) {
    return this.verb.normal(u, v);
  }
}

NurbsSurface.loft = function(curve1, curve2) {
  return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve1.impl.verb, curve2.impl.verb], 1));
};

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
