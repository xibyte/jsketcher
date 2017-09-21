import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'
import {Surface} from "../surface";
import Vector from "../../../math/vector";
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

    verb.geom.Intersect.curves(this.verb, other.verb, tol).forEach( i => add({
      u0: i.u0,
      u1: i.u1,
      p0: i.point0,
      p1: i.point1
    }));
    isecs.forEach(i => {
      i.p0 = pt(i.p0);
      i.p1 = pt(i.p1);
    });
    return isecs.filter(({u0, u1}) => {
      return Math.abs(this.tangentAtParam(u0).dot(other.tangentAtParam(u1))) <= tol;
    });

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
    const curves = verb_isec(this.verb, other.verb);
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


function verb_isec(nurbs1, nurbs2) {
  const tol = 1e-3
  const surface0 = nurbs1.asNurbs();
  const surface1 = nurbs2.asNurbs();
	var tess1 = verb.eval.Tess.rationalSurfaceAdaptive(surface0);
	var tess2 = verb.eval.Tess.rationalSurfaceAdaptive(surface1);
	var resApprox = verb.eval.Intersect.meshes(tess1,tess2);
	var exactPls = resApprox.map(function(pl) {
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
