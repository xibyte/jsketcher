import {Surface} from '../surface'
import {Line} from '../impl/line'
import {Curve} from '../curve'
import {Matrix3, AXIS, BasisForPlane} from  '../../../math/l3space'
import * as math from  '../../../math/math'

export class ApproxSurface extends Surface {
  constructor(mesh) {
    super();
    this.mesh = mesh;
  }
}

export class ApproxCurve extends Curve {
  constructor(points, proto) {
    super();
    this.points = points;
    this.segments = [];
    this.tShifts = [0];
    for (let i = 1; i < points.length; ++i) {
      const a = points[i - 1];
      const b = points[i];
      const line = Line.fromSegment(a, b);
      this.segments.push(line);
      this.tShifts.push(this.tShifts[this.tShifts.length - 1] + line.t(b));
    }
    this.proto = proto;
  }

  
  t(point) {
    for (let i = 0; i < this.points.length; ++i) {
      if (math.vectorsEqual(this.points[i], point)) {
        return this.tShifts[i];
      }
    }

    for (let i = 0; i < this.segments.length; ++i) {
      const line = this.segments[i];
      const subT = line.t(point);
      if (subT > 0 && subT < this.tShifts[i + 1]) {
        return this.tShifts[i] + subT;
      }
    }
    return NaN;
  }

  parametricEquation(t) {
    for (let i = 0; i < this.points.length; ++i) {
      if (math.equal(t, this.tShifts[i])) {
        return this.points[i];
      }
    }
    for (let i = 1; i < this.points.length; ++i) {
      if (t > this.tShifts[i - 1] && t < this.tShifts[i]) {
        return this.segments[i - 1].parametricEquation(t - this.tShifts[i - 1]);
      }
    }
    return null;
  }

  getChunk(p1, p2) {
    const result = [];
    this.getChunkImpl(p1, p2, result, true);
    return result;
  }
  
  getChunkImpl(p1, p2, result, includeBounds) {
    const t1 = this.t(p1);
    const t2 = this.t(p2);
    if (t1 > t2) {
      let tmp = p1;
      p1 = p2;
      p2 = tmp;
    }
    return this.getChunkDirectional(p1, p2, result, includeBounds);
  }
  
  getChunkDirectional(p1, p2, result, includeBounds) {
    let inState = false;
    for (let i = 1; i < this.points.length; ++i) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const line = this.segments[i - 1];
      if (inState) {
        result.push(a);  
      }
      if (!inState) {
        if (math.vectorsEqual(a, p1)) {
          if (includeBounds) result.push(p1);
          inState = true;
        } else if (math.equal(b, p1)) {
          //nothing
        } else {
          const t = line.t(p1);
          if (t > 0 && t < this.tShifts[i] - this.tShifts[i - 1]) {
            if (includeBounds) result.push(p1);
            inState = true;
          }
        }
      }
      if (inState) {
        if (math.vectorsEqual(b, p2)) {
          if (includeBounds) result.push(p2);
          break;
        } else if (math.equal(a, p2)) {
          //nothing, can't be here
        } else {
          const t = line.t(p2);
          if (t > 0 && t < this.tShifts[i] - this.tShifts[i - 1]) {
            if (includeBounds) result.push(p2);
            break;
          }
        }
      }
    }
  }

  translate(vector) {
    return new ApproxCurve(this.points.map(p => p.plus(vector)), this.proto);
  }

  approximate(resolution, from, to, path) {
    this.getChunkImpl(from, to, path, false);    
  }
}
