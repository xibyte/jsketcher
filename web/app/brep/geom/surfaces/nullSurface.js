import {distinctKnots} from '../impl/nurbs-ext';
import cache from '../impl/cache';
import * as ext from '../impl/nurbs-ext';
import NurbsCurve from '../curves/nurbsCurve';

export default class NullSurface {

  constructor() {
    this.domainU = [0, 1];
    this.domainV = [0, 1];
    this.knotsU = [0, 1];
    this.knotsV = [0, 1];
    this.isMirrored = false;
  }

  degreeU() {
    return 1;
  }

  degreeV() {
    return 1;
  }

  param(point) {
    return 0;
  }

  point(u, v) {
    return [0, 0, 0];
  }

  eval(u, v, order) {
    return [0, 0, 0];
  }

  normal(u, v) {
    return [0, 0, 1];
  }
}
