import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from 'geom/curves/nurbsCurve';
import {makeAngle0_360} from 'math/commons'
import {normalizeCurveEnds} from 'geom/impl/nurbs-ext';
import Vector from 'math/vector';
import CSys from "math/csys";
import {distanceAB} from "math/distance";
import {isCCW} from "geom/euclidean";
import {OCCCommandInterface} from "cad/craft/e0/occCommandInterface";


const RESOLUTION = 20;

export class SketchPrimitive {

  id: string;
  inverted: boolean;

  constructor(id) {
    this.id = id;
    this.inverted = false;
  }

  invert() {
    this.inverted = !this.inverted;
  }

  tessellate(resolution) {
    return this.toNurbs(CSys.ORIGIN).tessellate(resolution);
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

  toNurbs(csys: CSys) {
    let verbNurbs = this.toVerbNurbs(csys.outTransformation.apply, csys);
    if (this.inverted) {
      verbNurbs = verbNurbs.reverse();
    }
    const data = verbNurbs.asNurbs();
    normalizeCurveEnds(data);
    verbNurbs = new verb.geom.NurbsCurve(data);

    return new BrepCurve(new NurbsCurve(verbNurbs));
  }

  toVerbNurbs(tr, csys): any {
    throw 'not implemented'
  }

  tessellateImpl() {
    throw 'not implemented'
  }

  toOCCGeometry(oci: OCCCommandInterface, underName: string, csys: CSys) {
    throw 'not implemented'
  }

  massiveness() {
    return 50;
  }
}

export class Segment extends SketchPrimitive {

  a: Vector;
  b: Vector;

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

  toGenericForm() {
    const endpoints = [
      this.a, //from endpoint
      this.b, //to endpoint
    ];
    if (this.inverted) {
      endpoints.reverse();
    }
    return endpoints
  }

  toOCCGeometry(oci: OCCCommandInterface, underName: string, csys: CSys) {
    const genForm = this.toGenericForm().map(csys.outTransformation.apply);
    const [A, B] = genForm;
    oci.point(underName + "_A", A.x, A.y, A.z);
    oci.point(underName + "_B", B.x, B.y, B.z);
    oci.gcarc(underName, "seg", underName + "_A", underName + "_B")
  }

  tangentAtStart(): Vector {
    return this.b.minus(this.a);
  }

  tangentAtEnd(): Vector {
    return this.a.minus(this.b);
  }

  massiveness() {
    return this.a.minus(this.b).length();
  }
}

export class Arc extends SketchPrimitive {

  a: Vector;
  b: Vector;
  c: Vector;

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

    const arc = new verb.geom.Arc(tr(this.c).data(), xAxis.data(), yAxis.data(), distanceAB(this.c, this.a), 0, Math.abs(angle));
    
    return adjustEnds(arc, tr(this.a), tr(this.b))
  }

  toGenericForm() {
    const endpoints = [this.a, this.b];
    if (this.inverted) {
      endpoints.reverse();
    }
    const [a, b] = endpoints;
    const tangent = a.minus(this.c)._perpXY() //tangent vector
    if (this.inverted) {
      tangent._negate();
    }
    return [
      a, //from endpoint
      b, //to endpoint
      tangent //tangent vector
    ]
  }

  toOCCGeometry(oci: OCCCommandInterface, underName: string, csys: CSys) {

    const tr = csys.outTransformation.apply;
    const s = this;
    const a = tr(s.inverted ? s.b : s.a);
    const b = tr(s.inverted ? s.a : s.b);
    const c = tr(s.c);
    const tangent = c.minus(a)._cross(csys.z);//._normalize();

    if (s.inverted) {
      tangent._negate();
    }

    const A_TAN = a.plus(tangent);
    oci.point(underName + "_A", a.x, a.y, a.z);
    oci.point(underName + "_B", b.x, b.y, b.z);
    oci.point(underName + "_T1", a.x, a.y, a.z);
    oci.point(underName + "_T2", A_TAN.x, A_TAN.y, A_TAN.z);
    oci.gcarc(underName, "cir", underName + "_A", underName + "_T1", underName + "_T2", underName + "_B")
  }

  massiveness() {
    return this.a.minus(this.b).length();
  }
}

export class BezierCurve extends SketchPrimitive {
  a: Vector;
  b: Vector;
  cp1: Vector;
  cp2: Vector;

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

  massiveness() {
    return this.a.minus(this.b).length();
  }
}

export class EllipticalArc extends SketchPrimitive {

  c: Vector;
  rx: number;
  ry: number;
  rot: number
  a: Vector;
  b: Vector;

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

  massiveness() {
    return Math.max(this.rx, this.ry);
  }
}

export class Circle extends SketchPrimitive {
  c: Vector;
  r: number

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

  toOCCGeometry(oci: OCCCommandInterface, underName: string, csys: CSys) {
    const C = csys.outTransformation.apply(this.c);
    const DIR = csys.z;
    oci.circle(underName, ...C.data(), ...DIR.data(), this.r);
  }

  massiveness() {
    return this.r;
  }
}

export class Ellipse extends SketchPrimitive {

  c: Vector;
  rx: number;
  ry: number;
  rot: number

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

  massiveness() {
    return Math.max(this.rx, this.ry);
  }
}

export class Contour {

  segments: SketchPrimitive[];

  constructor() {
    this.segments = [];
  }

  get id() {
    return this.segments.reduce((prev, curr) => {
      return prev.id.localeCompare(curr.id) < 0 ? prev : curr;
    }).id;
  }

  add(obj) {
    this.segments.push(obj);
  }

  tessellateInCoordinateSystem(csys) {
    const out = [];
    for (let segIdx = 0; segIdx < this.segments.length; ++segIdx) {
      const segment = this.segments[segIdx];
      segment.toNurbs(csys).tessellate().forEach(p => out.push(p));
      out.pop();
    }
    return out;
  }

  transferInCoordinateSystem(csys) {
    const cc = [];
    for (let segIdx = 0; segIdx < this.segments.length; ++segIdx) {
      const segment = this.segments[segIdx];
      cc.push(segment.toNurbs(csys));
    }
    return cc;
  }

  tessellate(resolution) {
    const tessellation = [];
    for (const segment of this.segments) {
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

function adjustEnds(arc, a, b) {
  const data = arc.asNurbs();

  function setHomoPoint(homoPoint, vector) {
    homoPoint[0] = vector.x * homoPoint[3];
    homoPoint[1] = vector.y * homoPoint[3];
    homoPoint[2] = vector.z * homoPoint[3];
  }

  setHomoPoint(data.controlPoints[0], a);
  setHomoPoint(data.controlPoints[data.controlPoints.length - 1], b);

  return new verb.geom.NurbsCurve(data);
}

