import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'
import {Surface} from "../surface";
import Vector from "../../../math/vector";
import * as vec from "../../../math/vec";
import {Curve} from "../curve";

export class NurbsCurve extends Curve {

  constructor(verbCurve) {
    super();
    this.verb = verbCurve;
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
    return this.verb.split(this.verb.closestParam(point.data())).map(v => new NurbsCurve(v));
  }

  invert() {
    return new NurbsCurve(this.verb.reverse());
  }
  
  point(u) {
    return pt(this.verb.point(u));
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

    verb_curve_isec(this.verb, other.verb, tol).forEach( i => add({
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

NurbsCurve.prototype.createLinearNurbs = function(a, b) {
  return NurbsCurve.createLinearNurbs(a, b);
};

export class NurbsSurface extends Surface {

  constructor(verbSurface) {
    super();
    this.verb = verbSurface;
    this.inverted = false;
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

  intersectSurfaceForSameClass(other, tol) {
    const curves = verb_surface_isec(this.verb, other.verb, tol);
    let inverted = this.inverted !== other.inverted;
    return curves.map(curve => new NurbsCurve(inverted ?  curve.reverse() : curve));
  }
  
  invert() {
    let inverted = new NurbsSurface(this.verb);
    inverted.inverted = !this.inverted;
    return inverted;
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

function dist(p1, p2) {
  return math.distance3(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
}

function pt(data) {
  return new Point().set3(data);
}

function verb_surface_isec(nurbs1, nurbs2, tol) {
  const surface0 = nurbs1.asNurbs();
  const surface1 = nurbs2.asNurbs();
	const tess1 = verb.eval.Tess.rationalSurfaceAdaptive(surface0);
	const tess2 = verb.eval.Tess.rationalSurfaceAdaptive(surface1);
	const resApprox = verb.eval.Intersect.meshes(tess1,tess2);
	const exactPls = resApprox.map(function(pl) {
		return pl.map(function(inter) {
			return verb.eval.Intersect.surfacesAtPointWithEstimate(surface0,surface1,inter.uv0,inter.uv1,tol);
		});
	});
	return exactPls.map(function(x) {
		return verb.eval.Make.rationalInterpCurve(x.map(function(y) {
			return y.point;
		}), x.length - 1);
	}).map(cd => new verb.geom.NurbsCurve(cd));
}

function verb_curve_isec(curve1, curve2, tol) {

  let result = [];
  let segs1 = curve1.tessellate();
  let segs2 = curve2.tessellate();

  for (let i = 0; i < segs1.length - 1; i++) {
    let a1 = segs1[i];
    let b1 = segs1[i + 1];
    for (let j = 0; j < segs2.length - 1; j++) {
      let a2 = segs2[j];
      let b2 = segs2[j + 1];

      //TODO: minimize
      let isec = intersectSegs(a1, b1, a2, b2, tol);
      if (isec !== null) {
        let {u1, u2, point1, point2, l1, l2} = isec;
        result.push({
          u0: curve1.closestParam(point1),
          u1: curve2.closestParam(point2),
          point0: point1,
          point1: point2
        });
        if (math.areEqual(u1, l1, tol )) {
          i ++;
        }
        if (math.areEqual(u2, l2, tol )) {
          j ++;
        }
      }
    }
  }
  return result;
}

export function lineLineIntersection(p1, p2, v1, v2) {
  let zAx = vec.cross(v1, v2);
  const n1 = vec._normalize(vec.cross(zAx, v1));
  const n2 = vec._normalize(vec.cross(zAx, v2));
  return {
    u1: vec.dot(n2, vec.sub(p2, p1)) / vec.dot(n2, v1),
    u2: vec.dot(n1, vec.sub(p1, p2)) / vec.dot(n1, v2),
  }
}

function intersectSegs(a1, b1, a2, b2, tol) {
  let v1 = vec.sub(b1, a1);
  let v2 = vec.sub(b2, a2);
  let l1 = vec.length(v1);
  let l2 = vec.length(v2);
  vec._div(v1, l1);
  vec._div(v2, l2);

  let {u1, u2} = lineLineIntersection(a1, a2, v1, v2);
  let point1 = vec.add(a1, vec.mul(v1, u1));
  let point2 = vec.add(a2, vec.mul(v2, u2));
  let p2p = vec.lengthSq(vec.sub(point1, point2));
  let eq = (a, b) => math.areEqual(a, b, tol);
  if (u1 !== Infinity && u2 !== Infinity && math.areEqual(p2p, 0, tol*tol) &&
      ((u1 >0 && u1 < l1) || eq(u1, 0) || eq(u1, l1)) &&
      ((u2 >0 && u2 < l2) || eq(u2, 0) || eq(u2, l2))
     ) {
    return {point1, point2, u1, u2, l1, l2}
  }
  return null;
}
