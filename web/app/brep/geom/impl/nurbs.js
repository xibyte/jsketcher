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
    const chunks = this.verb.divideByArcLength(10);
    let startU = this.verb.closestParam(from.toArray());
    let endU = this.verb.closestParam(to.toArray());
    const reverse = startU > endU;
    if (reverse) {
      const tmp = startU;
      startU = endU;
      endU = tmp;
      chunks.reverse();
    }

    for (let sample of chunks) {
      const u = sample.u;
      if (u > startU + math.TOLERANCE && u < endU - math.TOLERANCE) {
        out.push(new Point().set3(this.verb.point(u)));
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

NurbsCurve.createLinearNurbs = function(a, b) {
  return new NurbsCurve(new verb.geom.Line(a.data(), b.data()));
};

NurbsCurve.prototype.createLinearNurbs = function(a, b) {
  return NurbsCurve.createLinearNurbs(a, b);
};


export class NurbsSurface {
  
  constructor(verbSurface) {
    this.verb = verbSurface;
  }

  coplanarUnsigned(other, tolerance) {
    const tess = this.verb.tessellate({maxDepth: 3});
  }
  
}