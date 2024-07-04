import {
  ArcEntity,
  Block,
  CircleEntity,
  DxfGlobalObject,
  EllipseEntity,
  InsertEntity,
  LineEntity,
  LWPolylineEntity,
  Parser,
  PointEntity,
  PolylineEntity,
  SplineEntity
} from "@dxfjs/parser";
import { Colors, DLine, DxfWriter, point3d, SplineArgs_t, SplineFlags, Units, vec3_t } from '@tarikjabiri/dxf';
import { SketchFormat_V3 } from './io';
import { Arc, SketchArcSerializationData } from './shapes/arc';
import { BezierCurve } from "./shapes/bezier-curve";
import { Circle } from './shapes/circle';
import { AngleBetweenDimension, DiameterDimension, HDimension, LinearDimension, VDimension } from './shapes/dim';
import { Ellipse } from './shapes/ellipse';
import { Label } from './shapes/label';
import { EndPoint, SketchPointSerializationData } from './shapes/point';
import { Segment, SketchSegmentSerializationData } from './shapes/segment';
import { SketchObject, SketchObjectSerializationData } from './shapes/sketch-object';
import { Layer } from './viewer2d';

interface IPoint {
  x: number,
  y: number
}

interface SketchCircleSerializationData extends SketchObjectSerializationData {
  c: SketchPointSerializationData;
  r: number
}

interface SketchEllipseSerializationData extends SketchObjectSerializationData {
  c: SketchPointSerializationData;
  rx: number;
  ry: number;
  rot: number;
}

interface ITransform {
  translation: IPoint;
  rotation: number;
  origin: IPoint;
}

const {PI, cos, sin, atan2} = Math

export function deg(angle: number): number {
  return (angle * 180) / PI
}

export function rad(angle: number): number {
  return (angle * PI) / 180
}

function polar(origin: IPoint, angle: number, radius: number): IPoint {
  return {
    x: origin.x + radius * cos(angle),
    y: origin.y + radius * sin(angle)
  }
}

function angle(fp: IPoint, sp: IPoint) {
  let angle = Math.atan2(sp.y - fp.y, sp.x - fp.x)
  if(angle < 0) angle += 2 * Math.PI
  return angle
}

function translate(p: IPoint, t: IPoint): IPoint {
  return {
    x: p.x + t.x,
    y: p.y + t.y,
  }
}

function rotatePoint(p: IPoint, t: ITransform): IPoint {
  const { cos, sin } = Math;
  const ox = p.x - t.origin.x;
  const oy = p.y - t.origin.y;
  return {
    x: t.origin.x + (ox * cos(t.rotation) - oy * sin(t.rotation)),
    y: t.origin.y + (ox * sin(t.rotation) + oy * cos(t.rotation))
  }
}

function applyTransformPoint(p: IPoint, t: ITransform) {
  return rotatePoint(translate(p, t.translation), t);
}

export class DxfWriterAdapter {
  writer: DxfWriter;

  constructor() {
    this.writer = new DxfWriter();
    this.writer.setUnits(Units.Millimeters);

    // Dimensions customization
    // I hard coded these values but I am not sure about them
    this.writer.setVariable('$DIMTXT', { 40: 10 }); // The text height
    this.writer.setVariable('$DIMASZ', { 40: 10 }); // Dimensioning arrow size

    // Theses for preserving the look like jsketcher
    this.writer.setVariable('$DIMDEC', { 70: 2 }); // Number of precision places displayed
    this.writer.setVariable('$DIMTIH', { 70: 0 }); // Text inside horizontal if nonzero
    this.writer.setVariable('$DIMTOH', { 70: 0 }); // Text outside horizontal if nonzero
    // Do not force text inside extensions
    this.writer.setVariable('$DIMTIX', { 70: 0 }); // Force text inside extensions if nonzero
    this.writer.setVariable('$DIMATFIT', { 70: 0 }); // Controls dimension text and arrow placement

    // For more customization
    // this.writer.setVariable('$DIMEXE', { 40: 10 }); // Extension line extension
    // this.writer.setVariable('$DIMCLRD', { 70: Colors.Yellow }); // Dimension line color
    // this.writer.setVariable('$DIMCLRE', { 70: Colors.Red }); // Dimension extension line color
    // this.writer.setVariable('$DIMCLRT', { 70: Colors.Green }); // Dimension text color
    // this.writer.setVariable('$DIMTIX', { 70: 1 }); // Force text inside extensions if nonzero
  }

  private _point(shape: EndPoint) {
    this.writer.addPoint(shape.x, shape.y, 0);
  }

  private _segment(shape: Segment) {
    this.writer.addLine(point3d(shape.a.x, shape.a.y), point3d(shape.b.x, shape.b.y));
  }

  private _arc(shape: Arc) {
    this.writer.addArc(
      point3d(shape.c.x, shape.c.y),
      shape.r.get(),
      deg(shape.getStartAngle()),
      deg(shape.getEndAngle())
    );
  }

  private _circle(shape: Circle) {
    this.writer.addCircle(point3d(shape.c.x, shape.c.y), shape.r.get());
  }

  private _ellipse(shape: Ellipse) {
    const majorX = Math.cos(shape.rotation) * shape.radiusX;
    const majorY = Math.sin(shape.rotation) * shape.radiusX;
    this.writer.addEllipse(
      point3d(shape.centerX, shape.centerY),
      point3d(majorX, majorY),
      shape.radiusY / shape.radiusX,
      0,
      2 * Math.PI
    );
  }

  private _bezier(shape: BezierCurve) {
    const controlPoints: vec3_t[] = [
      point3d(shape.p0.x, shape.p0.y),
      point3d(shape.p1.x, shape.p1.y),
      point3d(shape.p2.x, shape.p2.y),
      point3d(shape.p3.x, shape.p3.y),
    ];
    const splineArgs: SplineArgs_t = {
      controlPoints,
      flags: SplineFlags.Periodic,
    };
    this.writer.addSpline(splineArgs);
  }

  private _label(shape: Label) {
    const m = shape.assignedObject.labelCenter;
    if (!m) return;
    const height = shape.textHelper.fontSize;
    const h = shape.textHelper.textMetrics.width / 2;
    const lx = m.x - h + shape.offsetX;
    const ly = m.y + shape.marginOffset + shape.offsetY;
    this.writer.addText(point3d(lx, ly), height, shape.text);
  }

  private _vdim(shape: VDimension) {
    this.writer.addLinearDim(point3d(shape.a.x, shape.a.y), point3d(shape.b.x, shape.b.y), {
      angle: 90, // Make it vertical
      offset: -shape.offset,
    });
  }

  private _hdim(shape: HDimension) {
    this.writer.addLinearDim(point3d(shape.a.x, shape.a.y), point3d(shape.b.x, shape.b.y), { offset: -shape.offset });
  }

  private _linearDim(shape: LinearDimension) {
    this.writer.addAlignedDim(point3d(shape.a.x, shape.a.y), point3d(shape.b.x, shape.b.y), { offset: shape.offset });
  }

  private _ddim(shape: DiameterDimension) {
    // I remarked that the DiameterDimension looks like Radius dimension so I used RadialDim
    const radius = shape.obj.distanceA ? shape.obj.distanceA() : shape.obj.r.get();
    const x = shape.obj.c.x + radius * Math.cos(shape.angle);
    const y = shape.obj.c.y + radius * Math.sin(shape.angle);
    this.writer.addRadialDim(point3d(x, y), point3d(shape.obj.c.x, shape.obj.c.y));
  }

  private _bwdim(shape: AngleBetweenDimension) {
    // This is not working as expected.
    const s: DLine = {
      start: point3d(shape.a.a.x, shape.a.a.y),
      end: point3d(shape.a.b.x, shape.a.b.y),
    };
    const f: DLine = {
      start: point3d(shape.b.a.x, shape.b.a.y),
      end: point3d(shape.b.b.x, shape.b.b.y),
    };
    const c = point3d(shape.a.a.x, shape.a.a.y);
    const offset = shape.offset;
    const dyf = f.end.y - c.y;
    const dys = s.end.y - c.y;
    const df = Math.sqrt(Math.pow(f.end.x - c.x, 2) + Math.pow(f.end.y - c.y, 2));
    const ds = Math.sqrt(Math.pow(s.end.x - c.x, 2) + Math.pow(s.end.y - c.y, 2));
    const alphaf = Math.acos(dyf / df);
    const alphas = Math.acos(dys / ds);
    const alpham = Math.abs(alphaf - alphas) / 2 + (alphaf > alphas ? alphas : alphaf);
    const xm = c.x + offset*Math.cos(alpham)
    const ym = c.y + offset*Math.sin(alpham)
    this.writer.addAngularLinesDim(f, s, point3d(xm, ym));
  }

  export(layers: Layer<SketchObject>[]) {
    layers.forEach(layer => {
      // this will prevent addLayer from throwing.
      if (!this.writer.layer(layer.name))
        this.writer.addLayer(layer.name, Colors.Black);
      this.writer.setCurrentLayerName(layer.name);

      layer.objects.forEach(shape => {
        if (shape instanceof EndPoint) this._point(shape);
        else if (shape instanceof Segment) this._segment(shape);
        else if (shape instanceof Arc) this._arc(shape);
        else if (shape instanceof Circle) this._circle(shape);
        else if (shape instanceof Ellipse) this._ellipse(shape);
        else if (shape instanceof BezierCurve) this._bezier(shape);
        else if (shape instanceof Label) this._label(shape);
        else if (shape instanceof VDimension) this._vdim(shape);
        else if (shape instanceof HDimension) this._hdim(shape);
        else if (shape instanceof LinearDimension) this._linearDim(shape);
        else if (shape instanceof DiameterDimension) this._ddim(shape);
        else if (shape instanceof AngleBetweenDimension) this._bwdim(shape);
      });
    });
  }

  stringify(): string {
    // reset the current layer to 0, because its preserved in the dxf.
    this.writer.setZeroLayerAsCurrent();
    return this.writer.stringify();
  }
}

export class DxfParserAdapter {
  private static _seed = 0; // Used as ids for the shapes.

  private _createSketchObject(type: string, data: object) {
    return {
      id: (DxfParserAdapter._seed++).toString(),
      type, role: null, stage: 0, data
    }
  }

  private _createSketchFormat(obj: DxfGlobalObject): SketchFormat_V3 {
    DxfParserAdapter._seed = 0;
    const sketch: SketchFormat_V3 = {
      version: 3, objects: [], dimensions: [], labels: [],
      stages: [], constants: null, metadata: {}
    };
    const transform: ITransform = {
      translation: { x: 0, y: 0 },
      rotation: 0,
      origin: { x: 0, y: 0 }
    }

    this.handleEntities(obj.entities, sketch, transform)
    obj.entities.inserts.forEach(i => this._insert(obj.blocks, i, sketch));

    return sketch;
  }

  private handleEntities(entities: Omit<DxfGlobalObject["entities"], "inserts">, sketch: SketchFormat_V3, t: ITransform) {
    entities.arcs.forEach(a => sketch.objects.push(this._arc(a, t)));
    entities.circles.forEach(c => sketch.objects.push(this._circle(c, t)));
    entities.ellipses.forEach(e => sketch.objects.push(this._ellipse(e, t)));
    entities.lines.forEach(l => sketch.objects.push(this._segment(l, t)));
    entities.points.forEach(p => sketch.objects.push(this._point(p, t)));
    entities.lwPolylines.forEach(p => sketch.objects.push(...this._lwPolyline(p, t)));
    entities.polylines.forEach(p => sketch.objects.push(...this._polyline(p, t)));
    entities.splines.forEach(s => sketch.objects.push(...this._spline(s, t)));
  }

  private _insert(blocks: Block[], i: InsertEntity, sketch: SketchFormat_V3) {
    const block = blocks.find(block => {
      return block.name === i.blockName || block.name2 === i.blockName
    });

    if(block) {
      const transform: ITransform = {
        translation: {
          x: block.basePointX + i.x,
          y: block.basePointY + i.y
        },
        rotation: rad(i.rotation ?? 0),
        origin: { x: i.x, y: i.y },
      }
      this.handleEntities(block.entities, sketch, transform);
      block.entities.inserts.forEach(i => this._insert(blocks, i, sketch));
    }
  }

  private _spline(s: SplineEntity, t: ITransform) {
    const objects = [];
    for (let i = 0; i < s.controlPoints.length;) {
      const p1 = s.controlPoints[i];
      const p2 = s.controlPoints[++i];
      const p3 = s.controlPoints[++i];
      const p4 = s.controlPoints[++i];
      if(p1 && p2 && p3 && p4) {
        if(p1.x === p2.x && p3.x === p4.x && p1.y === p2.y && p3.y === p4.y) {
          const data: SketchSegmentSerializationData = {
            a: applyTransformPoint({ x: p1.x, y: p1.y }, t),
            b: applyTransformPoint({ x: p4.x, y: p4.y }, t)
          };
          objects.push(this._createSketchObject(Segment.prototype.TYPE, data));
        } else {
          const data = {
            cp4: applyTransformPoint({ x: p1.x, y: p1.y }, t),
            cp3: applyTransformPoint({ x: p2.x, y: p2.y }, t),
            cp2: applyTransformPoint({ x: p3.x, y: p3.y }, t),
            cp1: applyTransformPoint({ x: p4.x, y: p4.y }, t)
          };
          objects.push(this._createSketchObject(BezierCurve.prototype.TYPE, data));
        }
      }
    }
    return objects;
  }

  private _polyline(p: PolylineEntity, t: ITransform) {
    return this._lwPolyline(p, t);
  }

  private _lwPolyline(p: LWPolylineEntity | PolylineEntity, t: ITransform) {
    const objects = [];
    for (let i = 0; i < p.vertices.length;) {
      const curr = p.vertices[i];
      let next = p.vertices[++i];

      if(p.flag & 1 && !next) {
        next = p.vertices[0];
      }
      if(curr && next) {
        if(!curr.bulge || curr.bulge === 0) {
          const data: SketchSegmentSerializationData = {
            a: applyTransformPoint({ x: curr.x, y: curr.y }, t),
            b: applyTransformPoint({x: next.x, y: next.y}, t)
          };
          objects.push(this._createSketchObject(Segment.prototype.TYPE, data));
        } else {
          const beta = angle(curr, next);
          const theta = 4 * Math.atan(curr.bulge);
          const radius = (Math.hypot(curr.x - next.x, curr.y - next.y) / 2) / Math.sin(theta / 2);
          const center = polar(curr, beta + (Math.PI - theta) / 2, radius);
          const data: SketchArcSerializationData =  {
            a: applyTransformPoint(curr.bulge > 0 ? {x: curr.x, y: curr.y} : {x: next.x, y: next.y}, t),
            b: applyTransformPoint(curr.bulge > 0 ? {x: next.x, y: next.y} : {x: curr.x, y: curr.y}, t),
            c: applyTransformPoint(center, t),
          };
          objects.push(this._createSketchObject(Arc.prototype.TYPE, data));
        }
      }
    }
    return objects;
  }

  private _arc(a: ArcEntity, t: ITransform) {
    const center: IPoint = {x: a.centerX, y: a.centerY};
    const data: SketchArcSerializationData =  {
      a: applyTransformPoint(polar(center, rad(a.startAngle), a.radius), t),
      b: applyTransformPoint(polar(center, rad(a.endAngle), a.radius), t),
      c: applyTransformPoint(center, t),
    };
    return this._createSketchObject(Arc.prototype.TYPE, data);
  }

  private _circle(c: CircleEntity, t: ITransform) {
    const data: SketchCircleSerializationData = {
      c: applyTransformPoint({ x: c.centerX, y: c.centerY }, t),
      r: c.radius
    };
    return this._createSketchObject(Circle.prototype.TYPE, data);
  }

  private _ellipse(e: EllipseEntity, t: ITransform) {
    const c: IPoint = applyTransformPoint({x: e.centerX, y: e.centerY}, t);
    let rot = atan2(e.majorAxisY, e.majorAxisX);
    const rx = e.majorAxisX / cos(rot);
    const ry = e.ratioOfMinorAxisToMajorAxis * rx;
    rot += t.rotation;
    const data: SketchEllipseSerializationData = { c, rx, ry, rot };
    return this._createSketchObject(Ellipse.prototype.TYPE, data);
  }

  private _segment(l: LineEntity, t: ITransform) {
    const data: SketchSegmentSerializationData = {
      a: applyTransformPoint({x: l.startX, y: l.startY}, t),
      b: applyTransformPoint({x: l.endX, y: l.endY}, t)
    };
    return this._createSketchObject(Segment.prototype.TYPE, data);
  }

  private _point(p: PointEntity, t: ITransform) {
    const data: SketchPointSerializationData = applyTransformPoint(p, t);
    return this._createSketchObject(EndPoint.prototype.TYPE, data);
  }

  parse(dxfString: string): Promise<SketchFormat_V3> {
    return new Promise((resolve, reject) => {
      new Parser()
        .parse(dxfString)
        .then(dxfObject =>  resolve(this._createSketchFormat(dxfObject)))
        .catch(error => reject(error));
    });
  }
}
