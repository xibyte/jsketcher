import { Generator } from './id-generator';
import { Layer, Viewer } from './viewer2d';
import { Arc } from './shapes/arc';
import { EndPoint } from './shapes/point';
import { Segment } from './shapes/segment';
import { Circle } from './shapes/circle';
import { Ellipse } from './shapes/ellipse';
import { EllipticalArc } from './shapes/elliptical-arc';
import { BezierCurve } from './shapes/bezier-curve';
import {
  AngleBetweenDimension,
  DiameterDimension,
  Dimension,
  HDimension,
  LinearDimension,
  VDimension,
} from './shapes/dim';
import Vector from 'math/vector';
import exportTextData from 'gems/exportTextData';
import {
  AlgNumConstraint,
  ConstraintSerialization,
} from './constr/ANConstraints';
import { SketchGenerator } from './generators/sketchGenerator';
import { BoundaryGeneratorSchema } from './generators/boundaryGenerator';
import { ShapesTypes } from './shapes/sketch-types';
import { SketchObject } from './shapes/sketch-object';
import { Label } from 'sketcher/shapes/label';
import {
  Colors,
  DxfWriter,
  point3d,
  SplineArgs_t,
  SplineFlags,
  Units,
  vec3_t,
} from '@tarikjabiri/dxf';
import { DEG_RAD } from 'math/commons';

export interface SketchFormat_V3 {
  version: number;

  objects: {
    id: string;
    type: string;
    role: string;
    stage: number;
    data: any;
  }[];

  dimensions: {
    id: string;
    type: string;
    data: any;
  }[];

  labels: {
    id: string;
    type: string;
    data: any;
  }[];

  stages: {
    generators: {
      typeId: string;
    }[];

    constraints: ConstraintSerialization[];
  }[];

  constants: {
    [key: string]: string;
  };

  metadata: any;

  boundary?: ExternalBoundary;
}

class ExternalBoundary {}

export class IO {
  static exportTextData = exportTextData;

  viewer: Viewer;

  constructor(viewer) {
    this.viewer = viewer;
  }

  loadSketch(sketchData) {
    return this._loadSketch(JSON.parse(sketchData));
  }

  serializeSketch(metadata) {
    return JSON.stringify(this._serializeSketch(metadata));
  }

  _loadSketch(sketch: SketchFormat_V3) {
    this.cleanUpData();

    this.viewer.parametricManager.startTransaction();
    try {
      const getStage = pointer => {
        if (pointer === undefined) {
          return this.viewer.parametricManager.stage;
        }
        this.viewer.parametricManager.accommodateStages(pointer);
        return this.viewer.parametricManager.getStage(pointer);
      };

      if (sketch.boundary) {
        this.createBoundaryObjects(sketch.boundary);
      }
      this.viewer.createGroundObjects();

      if (sketch.version !== 3) {
        return;
      }

      const sketchLayer = this.viewer.findLayerByName('sketch');
      for (const obj of sketch.objects) {
        try {
          let skobj: SketchObject = null;
          const type = obj.type;

          if (type === Segment.prototype.TYPE) {
            skobj = Segment.read(obj.id, obj.data);
          } else if (type === EndPoint.prototype.TYPE) {
            skobj = EndPoint.read(obj.id, obj.data);
          } else if (type === Arc.prototype.TYPE) {
            skobj = Arc.read(obj.id, obj.data);
          } else if (type === Circle.prototype.TYPE) {
            skobj = Circle.read(obj.id, obj.data);
          } else if (type === Ellipse.prototype.TYPE) {
            skobj = Ellipse.read(obj.id, obj.data);
          } else if (type === EllipticalArc.prototype.TYPE) {
            skobj = EllipticalArc.read(obj.id, obj.data);
          } else if (type === BezierCurve.prototype.TYPE) {
            skobj = BezierCurve.read(obj.id, obj.data);
          }
          if (skobj != null) {
            skobj.role = obj.role;
            getStage(obj.stage).assignObject(skobj);
            sketchLayer.add(skobj);
            skobj.stabilize(this.viewer);
          }
        } catch (e) {
          console.error(e);
          console.error('Failed loading ' + obj.type + ' ' + obj.id);
        }
      }

      const index = this.viewer.createIndex();

      for (const obj of sketch.dimensions) {
        try {
          const type = obj.type;
          let skobj = null;
          if (type === HDimension.prototype.TYPE) {
            skobj = LinearDimension.load(HDimension, obj.id, obj.data, index);
          } else if (type === VDimension.prototype.TYPE) {
            skobj = LinearDimension.load(VDimension, obj.id, obj.data, index);
          } else if (type === LinearDimension.prototype.TYPE) {
            skobj = LinearDimension.load(
              LinearDimension,
              obj.id,
              obj.data,
              index
            );
          } else if (type === DiameterDimension.prototype.TYPE) {
            skobj = DiameterDimension.load(obj.id, obj.data, index);
          } else if (type === AngleBetweenDimension.prototype.TYPE) {
            skobj = AngleBetweenDimension.load(obj.id, obj.data, index);
          }
          if (skobj !== null) {
            this.viewer.dimLayer.add(skobj);
          }
        } catch (e) {
          console.error(e);
          console.error('Failed loading ' + obj.type + ' ' + obj.id);
        }
      }

      if (sketch.labels) {
        for (const obj of sketch.labels) {
          try {
            const type = obj.type;
            let skobj = null;
            if (type === Label.prototype.TYPE) {
              skobj = Label.read(obj.id, obj.data, index);
            }
            if (skobj !== null) {
              this.viewer.labelLayer.add(skobj);
            }
          } catch (e) {
            console.error(e);
            console.error('Failed loading ' + obj.type + ' ' + obj.id);
          }
        }
      }

      for (let i = 0; i < sketch.stages.length; i++) {
        const dataStage = sketch.stages[i];
        const stage = getStage(i);
        for (const constr of dataStage.constraints) {
          try {
            const constraint = AlgNumConstraint.read(constr, index);
            stage.addConstraint(constraint);
          } catch (e) {
            console.error(e);
            console.error(
              'skipping errant constraint: ' + constr && constr.typeId
            );
          }
        }
        for (const gen of dataStage.generators) {
          try {
            const generator = SketchGenerator.read(gen, index);
            stage.addGenerator(generator);
          } catch (e) {
            console.error(e);
            console.error('skipping errant generator: ' + gen && gen.typeId);
          }
        }
      }

      const constants = sketch.constants;
      if (constants !== undefined) {
        this.viewer.parametricManager.$constantDefinition.next(constants);
      }
    } finally {
      this.viewer.parametricManager.finishTransaction();
      this.viewer.parametricManager.notify();
    }
  }

  createBoundaryObjects(boundary) {
    const boundaryGenerator = new SketchGenerator(
      {
        boundaryData: boundary,
      },
      BoundaryGeneratorSchema
    );

    this.viewer.parametricManager.addGeneratorToStage(
      boundaryGenerator,
      this.viewer.parametricManager.groundStage
    );
  }

  cleanUpData() {
    for (let l = 0; l < this.viewer.layers.length; ++l) {
      const layer = this.viewer.layers[l];
      if (layer.objects.length !== 0) {
        layer.objects = [];
      }
    }
    this.viewer.deselectAll();
    Generator.resetIDGenerator(0);

    this.viewer.parametricManager.reset();
    this.viewer.parametricManager.notify();
  }

  _serializeSketch(metadata) {
    const sketch: SketchFormat_V3 = {
      version: 3,
      objects: [],
      dimensions: [],
      labels: [],
      stages: [],
      constants: this.viewer.parametricManager.constantDefinition,
      metadata,
    };

    for (const layer of this.viewer.layers) {
      for (const obj of layer.objects) {
        if (obj instanceof Dimension) {
          continue;
        }
        if (obj instanceof Label) {
          continue;
        }
        if (obj.isGenerated && !obj.generator.schema.persistGeneratedObjects) {
          continue;
        }
        try {
          sketch.objects.push({
            id: obj.id,
            type: obj.TYPE,
            role: obj.role,
            stage: this.viewer.parametricManager.getStageIndex(obj.stage),
            data: obj.write(),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }

    function pushObjectsFromLayer(layer, into) {
      for (const obj of layer.objects) {
        try {
          into.push({
            id: obj.id,
            type: obj.TYPE,
            data: obj.write(),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    pushObjectsFromLayer(this.viewer.dimLayer, sketch.dimensions);
    pushObjectsFromLayer(this.viewer.labelLayer, sketch.labels);

    for (const stage of this.viewer.parametricManager.stages) {
      const stageOut = {
        constraints: [],
        generators: [],
      };
      const systemConstraints = stage.algNumSystem.allConstraints;
      for (const sc of systemConstraints) {
        if (!sc.internal) {
          stageOut.constraints.push(sc.write());
        }
      }

      for (const gen of stage.generators) {
        if (gen.internal) {
          continue;
        }
        stageOut.generators.push(gen.write());
      }

      sketch.stages.push(stageOut);
    }

    return sketch;
  }

  getWorkspaceToExport() {
    return [
      this.viewer.layers,
      [this.viewer.labelLayer],
      this.viewer.dimLayers,
    ];
  }

  getLayersToExport() {
    const ws = this.getWorkspaceToExport();
    const toExport: Layer<SketchObject>[] = [];
    for (let t = 0; t < ws.length; ++t) {
      const layers = ws[t];
      for (let l = 0; l < layers.length; ++l) {
        const layer = layers[l];
        toExport.push(layer);
      }
    }
    return toExport;
  }

  isArc(obj: SketchObject): obj is Arc {
    return obj.TYPE === ShapesTypes.ARC;
  }

  isSegment(obj: SketchObject): obj is Segment {
    return obj.TYPE === ShapesTypes.SEGMENT;
  }

  isCircle(obj: SketchObject): obj is Circle {
    return obj.TYPE === ShapesTypes.CIRCLE;
  }

  isPoint(obj: SketchObject): obj is EndPoint {
    return obj.TYPE === ShapesTypes.POINT;
  }

  isEllipse(obj: SketchObject): obj is Ellipse {
    return obj.TYPE === ShapesTypes.ELLIPSE;
  }

  isBezier(obj: SketchObject): obj is BezierCurve {
    return obj.TYPE === ShapesTypes.BEZIER;
  }

  isLabel(obj: SketchObject): obj is Label {
    return obj.TYPE === ShapesTypes.LABEL;
  }

  isHDim(obj: SketchObject): obj is HDimension {
    return obj.TYPE === ShapesTypes.HDIM;
  }

  isVDim(obj: SketchObject): obj is VDimension {
    return obj.TYPE === ShapesTypes.VDIM;
  }

  isLinearDim(obj: SketchObject): obj is LinearDimension {
    return obj.TYPE === ShapesTypes.DIM;
  }

  isDDim(obj: SketchObject): obj is DiameterDimension {
    return obj.TYPE === ShapesTypes.DDIM;
  }

  isAngleBWDim(obj: SketchObject): obj is AngleBetweenDimension {
    return obj.TYPE === ShapesTypes.ANGLE_BW;
  }

  svgExport() {
    const T = ShapesTypes;
    const out = new TextBuilder();

    const bbox = new BBox();

    const a = new Vector();
    const b = new Vector();

    const prettyColors = new PrettyColors();
    const toExport = this.getLayersToExport();
    for (let l = 0; l < toExport.length; ++l) {
      const layer = toExport[l];
      const color = prettyColors.next();
      out.fline('<g id="$" fill="$" stroke="$" stroke-width="$">', [
        layer.name,
        'none',
        color,
        '2',
      ]);
      for (let i = 0; i < layer.objects.length; ++i) {
        const obj = layer.objects[i];
        if (obj.TYPE !== T.POINT) bbox.check(obj);
        if (this.isSegment(obj)) {
          out.fline('<line x1="$" y1="$" x2="$" y2="$" />', [
            obj.a.x,
            obj.a.y,
            obj.b.x,
            obj.b.y,
          ]);
        } else if (this.isArc(obj)) {
          a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
          b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
          const dir = a.cross(b).z > 0 ? 0 : 1;
          const r = obj.r.get();
          out.fline('<path d="M $ $ A $ $ 0 $ $ $ $" />', [
            obj.a.x,
            obj.a.y,
            r,
            r,
            dir,
            1,
            obj.b.x,
            obj.b.y,
          ]);
        } else if (this.isCircle(obj)) {
          out.fline('<circle cx="$" cy="$" r="$" />', [
            obj.c.x,
            obj.c.y,
            obj.r.get(),
          ]);
          //      } else if (obj.TYPE === T.DIM || obj.TYPE === T.HDIM || obj.TYPE === T.VDIM) {
        }
      }
      out.line('</g>');
    }
    bbox.inc(20);
    return (
      _format("<svg viewBox='$ $ $ $'>\n", bbox.bbox) + out.data + '</svg>'
    );
  }

  dxfExport() {
    const dxf: DxfWriter = new DxfWriter();
    const layersToExport = this.getLayersToExport();
    dxf.setUnits(Units.Millimeters);

    // Dimensions customization
    // I hard coded this values but I am not sure about them
    dxf.setVariable('$DIMTXT', { 40: 10 }); // The text height
    dxf.setVariable('$DIMASZ', { 40: 10 }); // Dimensioning arrow size

    // Theses for preserving the look like jsketcher
    dxf.setVariable('$DIMDEC', { 70: 2 }); // Number of precision places displayed
    dxf.setVariable('$DIMTIH', { 70: 0 }); // Text inside horizontal if nonzero
    dxf.setVariable('$DIMTOH', { 70: 0 }); // Text outside horizontal if nonzero
    dxf.setVariable('$DIMTIX', { 70: 1 }); // Force text inside extensions if nonzero
    dxf.setVariable('$DIMATFIT', { 70: 0 }); // Controls dimension text and arrow placement

    // For more customization
    // dxf.setVariable('$DIMEXE', { 40: 10 }); // Extension line extension
    // dxf.setVariable('$DIMCLRD', { 70: Colors.Yellow }); // Dimension line color
    // dxf.setVariable('$DIMCLRE', { 70: Colors.Red }); // Dimension extension line color
    // dxf.setVariable('$DIMCLRT', { 70: Colors.Green }); // Dimension text color

    layersToExport.forEach(layer => {
      // this will prevent addLayer from throwing.
      if (!dxf.tables.layerTable.exist(layer.name))
        dxf.addLayer(layer.name, Colors.Black, 'Continuous');
      dxf.setCurrentLayerName(layer.name);

      layer.objects.forEach(shape => {
        console.debug('exporting object', shape);

        if (this.isPoint(shape)) {
          dxf.addPoint(shape.x, shape.y, 0);
        } else if (this.isSegment(shape)) {
          dxf.addLine(
            point3d(shape.a.x, shape.a.y, 0),
            point3d(shape.b.x, shape.b.y, 0)
          );
        } else if (this.isArc(shape)) {
          dxf.addArc(
            point3d(shape.c.x, shape.c.y, 0),
            shape.r.get(),
            shape.getStartAngle() / DEG_RAD,
            shape.getEndAngle() / DEG_RAD
          );
        } else if (this.isCircle(shape)) {
          dxf.addCircle(point3d(shape.c.x, shape.c.y, 0), shape.r.get());
        } else if (this.isEllipse(shape)) {
          const majorX = Math.cos(shape.rotation) * shape.radiusX;
          const majorY = Math.sin(shape.rotation) * shape.radiusX;
          dxf.addEllipse(
            point3d(shape.centerX, shape.centerY, 0),
            point3d(majorX, majorY, 0),
            shape.radiusY / shape.radiusX,
            0,
            2 * Math.PI
          );
        } else if (this.isBezier(shape)) {
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
          dxf.addSpline(splineArgs);
        } else if (this.isLabel(shape)) {
          const m = shape.assignedObject.labelCenter;
          if (!m) {
            return;
          }
          const height = shape.textHelper.textMetrics.height as number;
          const h = shape.textHelper.textMetrics.width / 2;
          const lx = m.x - h + shape.offsetX;
          const ly = m.y + shape.marginOffset + shape.offsetY;

          dxf.addText(point3d(lx, ly, 0), height, shape.text);
        } else if (this.isVDim(shape)) {
          dxf.addLinearDim(
            point3d(shape.a.x, shape.a.y, 0),
            point3d(shape.b.x, shape.b.y, 0),
            {
              angle: 90, // Make it vertical
              offset: -shape.offset,
            }
          );
        } else if (this.isHDim(shape)) {
          dxf.addLinearDim(
            point3d(shape.a.x, shape.a.y, 0),
            point3d(shape.b.x, shape.b.y, 0),
            {
              offset: -shape.offset,
            }
          );
        } else if (this.isLinearDim(shape)) {
          dxf.addAlignedDim(
            point3d(shape.a.x, shape.a.y, 0),
            point3d(shape.b.x, shape.b.y, 0),
            {
              offset: shape.offset,
            }
          );
        } else if (this.isDDim(shape)) {
          // I remarked that the DiameterDimension looks like Radius dimension so I used RadialDim
          const radius = shape.obj.distanceA
            ? shape.obj.distanceA()
            : shape.obj.r.get();
          const x = shape.obj.c.x + radius * Math.cos(shape.angle);
          const y = shape.obj.c.y + radius * Math.sin(shape.angle);
          dxf.addRadialDim(
            point3d(x, y, 0),
            point3d(shape.obj.c.x, shape.obj.c.y, 0)
          );
        } else if (this.isAngleBWDim(shape)) {
          // its not implemented in dxf lib yet but will be soon
        }
      });
    });

    // reset the current layer to 0, because its preserved in the dxf.
    dxf.setCurrentLayerName('0');
    return dxf.stringify();
  }
}

function _format(str, args) {
  if (args.length == 0) return str;
  let i = 0;
  return str.replace(/\$/g, function () {
    if (args === undefined || args[i] === undefined)
      throw 'format arguments mismatch';
    let val = args[i];
    if (typeof val === 'number') val = val.toPrecision();
    i++;
    return val;
  });
}

/** @constructor */
function PrettyColors() {
  const colors = [
    '#000000',
    '#00008B',
    '#006400',
    '#8B0000',
    '#FF8C00',
    '#E9967A',
  ];
  let colIdx = 0;
  this.next = function () {
    return colors[colIdx++ % colors.length];
  };
}

/** @constructor */
function TextBuilder() {
  this.data = '';
  this.fline = function (chunk, args) {
    this.data += _format(chunk, args) + '\n';
  };
  this.line = function (chunk) {
    this.data += chunk + '\n';
  };
  this.number = function (n) {
    this.data += n.toPrecision();
  };
  this.numberln = function (n) {
    this.number(n);
    this.data += '\n';
  };
}

/** @constructor */
function BBox() {
  const bbox = [
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
  ];

  const T = ShapesTypes;

  this.checkLayers = function (layers) {
    for (let l = 0; l < layers.length; ++l)
      for (let i = 0; i < layers[l].objects.length; ++i)
        this.check(layers[l].objects[i]);
  };

  this.check = function (obj) {
    if (obj.TYPE === T.SEGMENT) {
      this.checkBounds(obj.a.x, obj.a.y);
      this.checkBounds(obj.b.x, obj.b.y);
    } else if (obj.TYPE === T.POINT) {
      this.checkBounds(obj.x, obj.y);
    } else if (obj.TYPE === T.ARC) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj.TYPE === T.CIRCLE) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj.TYPE === T.ELLIPSE || obj.TYPE === T.ELL_ARC) {
      this.checkCircBounds(
        obj.centerX,
        obj.centerY,
        Math.max(obj.radiusX, obj.radiusY)
      );
    } else if (obj) {
      obj.accept(o => {
        if (o.TYPE == T.POINT) {
          this.checkBounds(o.x, o.y);
        }
        return true;
      });
      //    } else if (obj.TYPE === T.DIM || obj.TYPE === T.HDIM || obj.TYPE === T.VDIM) {
    }
  };

  this.isValid = function () {
    return bbox[0] != Number.MAX_VALUE;
  };

  this.checkBounds = function (x, y) {
    bbox[0] = Math.min(bbox[0], x);
    bbox[1] = Math.min(bbox[1], y);
    bbox[2] = Math.max(bbox[2], x);
    bbox[3] = Math.max(bbox[3], y);
  };

  this.checkCircBounds = function (x, y, r) {
    this.checkBounds(x + r, y + r);
    this.checkBounds(x - r, y + r);
    this.checkBounds(x - r, y - r);
    this.checkBounds(x - r, y + r);
  };

  this.inc = function (by) {
    bbox[0] -= by;
    bbox[1] -= by;
    bbox[2] += by;
    bbox[3] += by;
  };

  this.width = function () {
    return bbox[2] - bbox[0];
  };

  this.height = function () {
    return bbox[3] - bbox[1];
  };

  this.bbox = bbox;
}

export { BBox };
