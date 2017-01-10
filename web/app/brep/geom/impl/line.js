import {Curve} from '../curve'

export class Line extends Curve {

  constructor(p0, v) {
    super();
    this.p0 = p0;
    this.v = v;
  }

  intersectEdge(edge) {
    throw 'not implemented';
  }

  intersectSurface(surface) {
    //assume surface is plane
    const s0 = surface.normal.multiply(surface.w);
    return surface.normal.dot(s0.minus(this.p0)) / surface.normal.dot(this.v); // 4.7.4
  }

  intersectCurve(curve, surface) {
    if (curve instanceof Line) {
      const otherNormal = surface.normal.cross(curve.v)._normalize();
      return otherNormal.dot(curve.p0.minus(this.p0)) / otherNormal.dot(this.v); // (4.8.3)    
    }
    return super.intersectCurve(curve);
  }

  parametricEquation(t) {
    return this.p0.plus(this.v.multiply(t));
  }
}

Line.fromTwoPlanesIntersection = function(plane1, plane2) {
  const v = plane1.normal.cross(plane2.normal);
  const plane1Vec = plane1.normal.multiply(plane1.w);
  const plane2Vec = plane2.normal.multiply(plane2.w);
  const p0 = plane1Vec.plus(plane2Vec);
  return new Line(p0, v);
};

Line.fromSegment = function(a, b) {
  return new Line(a, b.minus(a)._normalize());
};
