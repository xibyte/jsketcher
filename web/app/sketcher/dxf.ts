import { ArcEntity, CircleEntity, DxfGlobalObject, EllipseEntity, LineEntity, Parser, PointEntity } from '@dxfjs/parser';
import { Colors, DLine, DxfWriter, point3d, SplineArgs_t, SplineFlags, Units, vec3_t } from '@tarikjabiri/dxf';
import { SketchFormat_V3 } from './io';
import { Arc, SketchArcSerializationData } from './shapes/arc';
import { BezierCurve } from './shapes/bezier-curve';
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

  private _createSketchFormat(dxfObject: DxfGlobalObject): SketchFormat_V3 {
    DxfParserAdapter._seed = 0;
    const sketch: SketchFormat_V3 = {
      version: 3, objects: [], dimensions: [], labels: [],
      stages: [], constants: {}, metadata: {}
    };

    const {arcs, circles, ellipses, lines, points} = dxfObject.entities

    arcs.forEach(a => sketch.objects.push(this._arc(a)));
    circles.forEach(c => sketch.objects.push(this._circle(c)));
    ellipses.forEach(e => sketch.objects.push(this._ellipse(e)));
    lines.forEach(l => sketch.objects.push(this._segment(l)));
    points.forEach(p => sketch.objects.push(this._point(p)));

    return sketch;
  }

  private _arc(a: ArcEntity) {
    const center: IPoint = {x: a.centerX, y: a.centerY};
    const data: SketchArcSerializationData =  {
      a: polar(center, rad(a.startAngle), a.radius),
      b: polar(center, rad(a.endAngle), a.radius),
      c: center,
    };
    return this._createSketchObject(Arc.prototype.TYPE, data);
  }

  private _circle(c: CircleEntity) {
    const center: IPoint = {x: c.centerX, y: c.centerY};
    const data: SketchCircleSerializationData = { c: center, r: c.radius };
    return this._createSketchObject(Circle.prototype.TYPE, data);
  }

  private _ellipse(e: EllipseEntity) {
    const c: IPoint = {x: e.centerX, y: e.centerY};
    const rot = atan2(e.majorAxisY, e.majorAxisX);
    const rx = e.majorAxisX / cos(rot);
    const ry = e.ratioOfMinorAxisToMajorAxis * rx;
    const data: SketchEllipseSerializationData = { c, rx, ry, rot };
    return this._createSketchObject(Ellipse.prototype.TYPE, data);
  }

  private _segment(l: LineEntity) {
    const data: SketchSegmentSerializationData = {
      a: {x: l.startX, y: l.startY},
      b: {x: l.endX, y: l.endY}
    };
    return this._createSketchObject(Segment.prototype.TYPE, data);
  }

  private _point(p: PointEntity) {
    const data: SketchPointSerializationData = { x: p.x, y: p.y };
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
