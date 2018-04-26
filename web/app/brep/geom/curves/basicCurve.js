import {closestToCurveParam} from './closestPoint';
import InvertedCurve from './invertedCurve';
import BoundedCurve from './boundedCurve';

export default class BasicCurve {
  
  param(pt) {
    return closestToCurveParam(this, pt);
  }
  
  invert() {
    return new InvertedCurve(this);
  }

  split(u) {
    return BoundedCurve.splitCurve(this, u);
  }

}