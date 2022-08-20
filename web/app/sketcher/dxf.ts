import {
  Colors,
  DxfWriter,
  point3d,
  SplineArgs_t,
  SplineFlags,
  Units,
  vec3_t,
} from '@tarikjabiri/dxf';
import { deg2rad } from 'math/commons';
import { Arc } from './shapes/arc';
import { BezierCurve } from './shapes/bezier-curve';
import { Circle } from './shapes/circle';
import {
  AngleBetweenDimension,
  DiameterDimension,
  HDimension,
  LinearDimension,
  VDimension,
} from './shapes/dim';
import { Ellipse } from './shapes/ellipse';
import { Label } from './shapes/label';
import { EndPoint } from './shapes/point';
import { Segment } from './shapes/segment';
import { SketchObject } from './shapes/sketch-object';
import { Layer } from './viewer2d';

export class DxfWriterAdapter {
  writer: DxfWriter;

  constructor() {
    this.writer = new DxfWriter();
    this.writer.setUnits(Units.Millimeters);

    // Dimensions customization
    // I hard coded this values but I am not sure about them
    this.writer.setVariable('$DIMTXT', { 40: 10 }); // The text height
    this.writer.setVariable('$DIMASZ', { 40: 10 }); // Dimensioning arrow size

    // Theses for preserving the look like jsketcher
    this.writer.setVariable('$DIMDEC', { 70: 2 }); // Number of precision places displayed
    this.writer.setVariable('$DIMTIH', { 70: 0 }); // Text inside horizontal if nonzero
    this.writer.setVariable('$DIMTOH', { 70: 0 }); // Text outside horizontal if nonzero
    this.writer.setVariable('$DIMTIX', { 70: 1 }); // Force text inside extensions if nonzero
    this.writer.setVariable('$DIMATFIT', { 70: 0 }); // Controls dimension text and arrow placement

    // For more customization
    // this.writer.setVariable('$DIMEXE', { 40: 10 }); // Extension line extension
    // this.writer.setVariable('$DIMCLRD', { 70: Colors.Yellow }); // Dimension line color
    // this.writer.setVariable('$DIMCLRE', { 70: Colors.Red }); // Dimension extension line color
    // this.writer.setVariable('$DIMCLRT', { 70: Colors.Green }); // Dimension text color
  }

  point(shape: EndPoint) {
    this.writer.addPoint(shape.x, shape.y, 0);
  }

  segment(shape: Segment) {
    this.writer.addLine(
      point3d(shape.a.x, shape.a.y, 0),
      point3d(shape.b.x, shape.b.y, 0)
    );
  }

  arc(shape: Arc) {
    this.writer.addArc(
      point3d(shape.c.x, shape.c.y, 0),
      shape.r.get(),
      deg2rad(shape.getStartAngle()),
      deg2rad(shape.getEndAngle())
    );
  }

  circle(shape: Circle) {
    this.writer.addCircle(point3d(shape.c.x, shape.c.y, 0), shape.r.get());
  }

  ellipse(shape: Ellipse) {
    const majorX = Math.cos(shape.rotation) * shape.radiusX;
    const majorY = Math.sin(shape.rotation) * shape.radiusX;
    this.writer.addEllipse(
      point3d(shape.centerX, shape.centerY, 0),
      point3d(majorX, majorY, 0),
      shape.radiusY / shape.radiusX,
      0,
      2 * Math.PI
    );
  }

  bezier(shape: BezierCurve) {
    const controlPoints: vec3_t[] = [
      point3d(shape.p0.x, shape.p0.y, 0),
      point3d(shape.p1.x, shape.p1.y, 0),
      point3d(shape.p2.x, shape.p2.y, 0),
      point3d(shape.p3.x, shape.p3.y, 0),
    ];
    const splineArgs: SplineArgs_t = {
      controlPoints,
      flags: SplineFlags.Periodic,
    };
    this.writer.addSpline(splineArgs);
  }

  label(shape: Label) {
    const m = shape.assignedObject.labelCenter;
    if (!m) return;
    const height = shape.textHelper.textMetrics.height as number;
    const h = shape.textHelper.textMetrics.width / 2;
    const lx = m.x - h + shape.offsetX;
    const ly = m.y + shape.marginOffset + shape.offsetY;
    this.writer.addText(point3d(lx, ly, 0), height, shape.text);
  }

  vdim(shape: VDimension) {
    this.writer.addLinearDim(
      point3d(shape.a.x, shape.a.y, 0),
      point3d(shape.b.x, shape.b.y, 0),
      {
        angle: 90, // Make it vertical
        offset: -shape.offset,
      }
    );
  }

  hdim(shape: HDimension) {
    this.writer.addLinearDim(
      point3d(shape.a.x, shape.a.y, 0),
      point3d(shape.b.x, shape.b.y, 0),
      {
        offset: -shape.offset,
      }
    );
  }

  linearDim(shape: LinearDimension) {
    this.writer.addAlignedDim(
      point3d(shape.a.x, shape.a.y, 0),
      point3d(shape.b.x, shape.b.y, 0),
      {
        offset: shape.offset,
      }
    );
  }

  ddim(shape: DiameterDimension) {
    // I remarked that the DiameterDimension looks like Radius dimension so I used RadialDim
    const radius = shape.obj.distanceA
      ? shape.obj.distanceA()
      : shape.obj.r.get();
    const x = shape.obj.c.x + radius * Math.cos(shape.angle);
    const y = shape.obj.c.y + radius * Math.sin(shape.angle);
    this.writer.addRadialDim(
      point3d(x, y, 0),
      point3d(shape.obj.c.x, shape.obj.c.y, 0)
    );
  }

  bwdim(shape: AngleBetweenDimension) {
    // its not implemented in dxf lib yet but will be soon
  }

  export(layers: Layer<SketchObject>[]) {
    layers.forEach(layer => {
      // this will prevent addLayer from throwing.
      if (!this.writer.tables.layerTable.exist(layer.name))
        this.writer.addLayer(layer.name, Colors.Black, 'Continuous');
      this.writer.setCurrentLayerName(layer.name);

      layer.objects.forEach(shape => {
        if (shape instanceof EndPoint) this.point(shape);
        else if (shape instanceof Segment) this.segment(shape);
        else if (shape instanceof Arc) this.arc(shape);
        else if (shape instanceof Circle) this.circle(shape);
        else if (shape instanceof Ellipse) this.ellipse(shape);
        else if (shape instanceof BezierCurve) this.bezier(shape);
        else if (shape instanceof Label) this.label(shape);
        else if (shape instanceof VDimension) this.vdim(shape);
        else if (shape instanceof HDimension) this.hdim(shape);
        else if (shape instanceof LinearDimension) this.linearDim(shape);
        else if (shape instanceof DiameterDimension) this.ddim(shape);
        else if (shape instanceof AngleBetweenDimension) this.bwdim(shape);
      });
    });
  }

  stringify() {
    // reset the current layer to 0, because its preserved in the dxf.
    this.writer.setCurrentLayerName('0');
    return this.writer.stringify();
  }
}
