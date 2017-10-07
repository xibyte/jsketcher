import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'
import {Surface} from "../surface";
import Vector from "../../../math/vector";
import {Curve} from "../curve";
import * as impl from "./nurbs-impl";

export class NurbsCurve extends Curve {

  constructor(verbCurve) {
    super();
    this.verb = verbCurve;
    this.data = verbCurve.asNurbs();
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z).toArray();
    return new NurbsCurve(this.verb.transform(tr));
  }
  
  tangentAtPoint(point) {
    return pt(this.verb.tangent(this.verb.closestParam(point.data())))._normalize();
  }

  tangentAtParam(param) {
    return pt(this.verb.tangent(param ))._normalize();
  }
  
  closestDistanceToPoint(point) {
    const closest = this.verb.closestPoint(point.data());
    return math.distance3(point.x, point.y, point.z, closest[0], closest[1], closest[2]);
  }

  split(point) {
    return this.splitByParam(this.verb.closestParam(point.data()));
  }

  splitByParam(u) {
    let split = verb.eval.Divide.curveSplit(this.data, u);
    split.forEach(n => {
      let min = n.knots[0];
      let max = n.knots[n.knots.length - 1];
      let d = max - min;
      for (let i = 0; i < n.knots.length; i++) {
        let val = n.knots[i];
        if (val === min) {
          n.knots[i] = 0;
        } else if (val === max) {
          n.knots[i] = 1;
        } else {
          n.knots[i] = (val - min) / d;
        }
      }
    });
    split = split.map(c => new verb.geom.NurbsCurve(c));
    const splitCheck = (split) => {
      return (
        math.equal(this.verb.closestParam(split[0].point(1)), this.verb.closestParam(split[1].point(0))) &&
        math.equal(this.verb.closestParam(split[0].point(0)), 0) &&
        math.equal(this.verb.closestParam(split[0].point(1)), u) &&
        math.equal(this.verb.closestParam(split[1].point(0)), u) &&
        math.equal(this.verb.closestParam(split[1].point(1)), 1)
      )
    };
    if (!splitCheck(split)) {
      throw 'wrong split';
    }
    // if (!splitCheck(split)) {
    //   split.reverse();
    // }
    return split.map(v => new NurbsCurve(v));
  }

  invert() {
    return new NurbsCurve(this.verb.reverse());
  }
  
  point(u) {
    return pt(this.verb.point(u));
  }

  tessellate(tessTol, scale) {
    return impl.curveTessellate(this.data, tessTol, scale).map(p => pt(p));
  }

  intersectCurve(other, tol) {
    let isecs = [];
    tol = tol || 1e-3;

    const eq = (v1, v2) => math.areVectorsEqual3(v1, v2, tol);

    function add(i0) {
      for (let i1 of isecs) {
        if (eq(i0.p0, i1.p0)) {
          return;    
        }    
      }  
      isecs.push(i0);
    }

    function isecOn(c0, c1, u0) {
      const p0 = c0.verb.point(u0);
      const u1 = c1.verb.closestParam(p0);
      const p1 = c1.verb.point(u1);
      if (eq(p0, p1)) {
        if (c0 === other) {
          add({u0: u1, u1: u0, p0: p1, p1: p0});
        } else {
          add({u0, u1, p0, p1});
        }
       
      }
    }
    
    isecOn(this, other, 0);
    isecOn(this, other, 1);
    isecOn(other, this, 0);
    isecOn(other, this, 1);

    impl.curveIntersect(this.data, other.data, tol).forEach(i => add({
      u0: i.u0,
      u1: i.u1,
      p0: i.point0,
      p1: i.point1
    }));
    isecs.forEach(i => {
      i.p0 = pt(i.p0);
      i.p1 = pt(i.p1);
    });
    isecs = isecs.filter(({u0, u1}) => {
      let collinearFactor = Math.abs(this.tangentAtParam(u0).dot(other.tangentAtParam(u1)));
      return !math.areEqual(collinearFactor, 1, tol);
    });
    return isecs;
}

  static createByPoints(points, degeree) {
    points = points.map(p => p.data());
    return new NurbsCurve(new verb.geom.NurbsCurve.byPoints(points, degeree));
  }
}

NurbsCurve.createLinearNurbs = function(a, b) {
  return new NurbsCurve(new verb.geom.Line(a.data(), b.data()));
};

export class NurbsSurface extends Surface {

  constructor(verbSurface, inverted) {
    super();
    this.data = verbSurface.asNurbs();
    this.verb = verbSurface;
    this.inverted = inverted === true;
    this.mirrored = NurbsSurface.isMirrored(this);
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
    return this.normalUV(0.5, 0.5);
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
    let a = surface.point(0, 0);
    let b = surface.point(1, 0);
    let c = surface.point(1, 1);
    return b.minus(a).cross(c.minus(a))._normalize().dot(surface.normalUV(0, 0)) < 0;
  }

  intersectSurfaceForSameClass(other, tol) {
    const curves = impl.surfaceIntersect(this.data, other.data, tol);
    let inverted = this.inverted !== other.inverted;
    return curves.map(curve => new NurbsCurve(inverted ?  curve.reverse() : curve));
  }
  
  invert() {
    return new NurbsSurface(this.verb, !this.inverted);
  }

  isoCurve(param, useV) {
    const data = verb.eval.Make.surfaceIsocurve(this.verb._data, param, useV);
    const isoCurve = new verb.geom.NurbsCurve(data);
    return new NurbsCurve(isoCurve);
  }

  isoCurveAlignU(param) {
    return this.isoCurve(param, true);
  }

  isoCurveAlignV(param) {
    return this.isoCurve(param, false);
  }
}

NurbsSurface.WORKING_POINT_SCALE_FACTOR = 1000;
NurbsSurface.WORKING_POINT_UNSCALE_FACTOR = 1 / NurbsSurface.WORKING_POINT_SCALE_FACTOR;

function pt(data) {
  return new Point().set3(data);
}

