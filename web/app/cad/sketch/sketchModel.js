import verb from 'verb-nurbs'
import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from 'geom/curves/nurbsCurve';
import {makeAngle0_360} from 'math/commons'
import {normalizeCurveEnds} from 'geom/impl/nurbs-ext';
import Vector from 'math/vector';
import CSys from "math/csys";
import {distanceAB} from "math/distance";
import {isCCW} from "geom/euclidean";

const RESOLUTION = 20;

class SketchPrimitive {
  constructor(id) {
    this.id = id;
    this.inverted = false;
  }

  invert() {
    this.inverted = !this.inverted;
  }

  tessellate(resolution) {
    return this.toNurbs(CSys.ORIGIN).tessellate();
    // return brepCurve.impl.verb.tessellate().map(p => new Vector().set3(p) );

    // const tessellation = this.tessellateImpl(resolution);
    // if (this.inverted) {
    //   tessellation.reverse();
    // }
    // return tessellation;
  }

  get isCurve() {
    return this.constructor.name !== 'Segment';
  }

  get isSegment() {
    return !this.isCurve;
  }

  toNurbs(csys) {
    let verbNurbs = this.toVerbNurbs(csys.outTransformation.apply, csys);
    if (this.inverted) {
      verbNurbs = verbNurbs.reverse();
    }
    let data = verbNurbs.asNurbs();
    normalizeCurveEnds(data);
    verbNurbs = new verb.geom.NurbsCurve(data);

    return new BrepCurve(new NurbsCurve(verbNurbs));
  }

  toVerbNurbs(tr) {
    throw 'not implemented'
  }

  tessellateImpl() {
    throw 'not implemented'
  }
}

export class Segment extends SketchPrimitive {
  constructor(id, a, b) {
    super(id);
    this.a = a;
    this.b = b;
  }

  tessellate(resolution) {
    return [this.a, this.b];
  }

  toVerbNurbs(tr) {
    return new verb.geom.Line(tr(this.a).data(), tr(this.b).data());
  }
}

export class Arc extends SketchPrimitive {
  constructor(id, a, b, c) {
    super(id);
    this.a = a;
    this.b = b;
    this.c = c;
  }

  toVerbNurbs(tr, csys) {
    
    const basisX = csys.x;
    const basisY = csys.y;
    
    const startAngle = makeAngle0_360(Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x));
    const endAngle = makeAngle0_360(Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x));

    let angle = endAngle - startAngle;
    if (angle < 0) {
      angle = Math.PI * 2 + angle;
    }
    function pointAtAngle(angle) {
      const dx = basisX.multiply(Math.cos(angle));
      const dy = basisY.multiply(Math.sin(angle));
      return dx.plus(dy);
    }
    const xAxis = pointAtAngle(startAngle);
    const yAxis = pointAtAngle(startAngle + Math.PI * 0.5);

    let arc = new verb.geom.Arc(tr(this.c).data(), xAxis.data(), yAxis.data(), distanceAB(this.c, this.a), 0, Math.abs(angle));
    
    return adjustEnds(arc, tr(this.a), tr(this.b))
  }
}

export class BezierCurve extends SketchPrimitive {
  constructor(id, a, b, cp1, cp2) {
    super(id);
    this.a = a;
    this.b = b;
    this.cp1 = cp1;
    this.cp2 = cp2;
  }

  toVerbNurbs(tr) {
    return new verb.geom.BezierCurve([tr(this.a).data(), tr(this.cp1).data(), tr(this.cp2).data(), tr(this.b).data()], null);
  }
}

export class EllipticalArc extends SketchPrimitive {
  constructor(id, c, rx, ry, rot, a, b) {
    super(id);
    this.c = c;
    this.rx = rx;
    this.ry = ry;
    this.rot = rot;
    this.a = a;
    this.b = b;
  }

  toVerbNurbs(tr, csys) {
    const ax = Math.cos(this.rot);
    const ay = Math.sin(this.rot);

    const xAxis = new Vector(ax, ay)._multiply(this.rx);
    const yAxis = new Vector(-ay, ax)._multiply(this.ry);

    const startAngle = Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x) - this.rot;
    const endAngle  = Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x) - this.rot;

    if (startAngle > endAngle) {

    }

    // let arc = new verb.geom.EllipseArc(tr(this.c).data(), tr(xAxis).data(), tr(yAxis).data(), startAngle, endAngle);
    let arc = new verb.geom.EllipseArc(this.c.data(), xAxis.data(), yAxis.data(), startAngle, endAngle);
    arc = arc.transform(csys.outTransformation.toArray());

    return arc;
    // return adjustEnds(arc, tr(this.a), tr(this.b))
  }
}

export class Circle extends SketchPrimitive {
  constructor(id, c, r) {
    super(id);
    this.c = c;
    this.r = r;
  }

  toVerbNurbs(tr, csys) {
    const basisX = csys.x;
    const basisY = csys.y;
    return new verb.geom.Circle(tr(this.c).data(), basisX.data(), basisY.data(), this.r);
  }
}

export class Ellipse extends SketchPrimitive {
  constructor(id, c, rx, ry, rot) {
    super(id);
    this.c = c;
    this.rx = rx;
    this.ry = ry;
    this.rot = rot;
  }

  toVerbNurbs(tr) {

    const ax = Math.cos(this.rot);
    const ay = Math.sin(this.rot);

    const xAxis = new Vector(ax, ay)._multiply(this.rx);
    const yAxis = new Vector(-ay, ax)._multiply(this.ry);

    return new verb.geom.Ellipse(tr(this.c).data(), tr(xAxis).data(), tr(yAxis).data());
  }
}

export class Contour {

  constructor() {
    this.segments = [];
  }

  add(obj) {
    this.segments.push(obj);
  }

  tessellateInCoordinateSystem(csys) {
    let out = [];
    for (let segIdx = 0; segIdx < this.segments.length; ++segIdx) {
      let segment = this.segments[segIdx];
      segment.toNurbs(csys).tessellate().forEach(p => out.push(p));
      out.pop();
    }
    return out;
  }

  transferInCoordinateSystem(csys) {
    const cc = [];
    for (let segIdx = 0; segIdx < this.segments.length; ++segIdx) {
      let segment = this.segments[segIdx];
      cc.push(segment.toNurbs(csys));
    }
    return cc;
  }

  tessellate(resolution) {
    const tessellation = [];
    for (let segment of this.segments) {
      const segmentTessellation = segment.tessellate(resolution);
      //skip last one because it's guaranteed to be closed
      for (let i = 0; i < segmentTessellation.length - 1; ++i) {
        tessellation.push(segmentTessellation[i]);
      }
    }
    return tessellation;
  }

  isCCW() {
    return isCCW(this.tessellate(10));
  }

  reverse() {
    this.segments.reverse();
    this.segments.forEach(s => s.invert());
  }
}

class CompositeCurve {

  constructor() {
    this.curves = [];
    this.points = [];
    this.groups = [];
  }

  add(curve, point, group) {
    this.curves.push(curve);
    this.points.push(point);
    this.groups.push(group);
  }
}

function adjustEnds(arc, a, b) {
  let data = arc.asNurbs();

  function setHomoPoint(homoPoint, vector) {
    homoPoint[0] = vector.x * homoPoint[3];
    homoPoint[1] = vector.y * homoPoint[3];
    homoPoint[2] = vector.z * homoPoint[3];
  }

  setHomoPoint(data.controlPoints[0], a);
  setHomoPoint(data.controlPoints[data.controlPoints.length - 1], b);

  return new verb.geom.NurbsCurve(data);
}

