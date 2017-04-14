import verb from 'verb-nurbs'
import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'

export class NurbsCurve {

  constructor(verbCurve) {
    this.verb = verbCurve;
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z).toArray();
    return new NurbsCurve(this.verb.transform(tr));
  }
  
  approximate(resolution, from, to, out) {
    const off = out.length;
    let u = this.verb.closestParam(from.toArray());
    let endU = this.verb.closestParam(to.toArray());
    const reverse = u > endU;
    if (reverse) {
      const tmp = u;
      u = endU;
      endU = tmp;
    }

    const length = this.verb.lengthAtParam(endU) - this.verb.lengthAtParam(u);
    if (length < resolution) {
      return 
    }
    const step = this.verb.paramAtLength(length / resolution);
    u += step;
    for (;u < endU; u += step) {
      out.push(new Point().set3(this.verb.point(u)));
    }
    if (reverse) {
      for (let i = off, j = out.length - 1; i != j; ++i, --j) {
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
    }
  }

  approximateU(resolution, paramFrom, paramTo, consumer) {
    let u = paramFrom;
    let endU = paramTo;
    let step = this.verb.paramAtLength(resolution);
    if (u > endU) {
      step *= -1;
    }
    u += step;
    for (;step > 0 ? u < endU : u > endU; u += step) {
      consumer(u);
    }
  }
  
  tangentAtPoint(point) {
    return new Point().set3(this.verb.tangent(this.verb.closestParam(point.data())));
  }
  
  closestDistanceToPoint(point) {
    const closest = this.verb.closestPoint(point.data());
    return math.distance3(point.x, point.y, point.z, closest[0], closest[1], closest[2]);
  }
  
  tangent(point) {
    return new Point().set3(this.verb.tangent( this.verb.closestParam(point.data() )));
  }
  
  intersect(other, tolerance) {
    return verb.geom.Intersect.curves(this.verb, other.verb, tolerance).map(i => new Point().set3(i.point0));
  }
  
  static createByPoints(points, degeree) {
    points = points.map(p => p.data());
    return new NurbsCurve(new verb.geom.NurbsCurve.byPoints(points, degeree));
  }
}

NurbsCurve.prototype.createLinearNurbs = function(a, b) {
  return new NurbsCurve(new verb.geom.Line(a.data(), b.data()));
};


export class NurbsSurface {
  
  constructor(verbSurface) {
    this.verb = verbSurface;
  }
  
}