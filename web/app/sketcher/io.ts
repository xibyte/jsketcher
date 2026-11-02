import { Generator } from './id-generator';
import { Layer, Viewer } from './viewer2d';
import { Arc } from './shapes/arc';
import { EndPoint } from './shapes/point';
import { Segment } from './shapes/segment';
import { Circle } from './shapes/circle';
import { Ellipse } from './shapes/ellipse';
import { EllipticalArc } from './shapes/elliptical-arc';
import { BezierCurve } from './shapes/bezier-curve';
import { BSpline } from './shapes/b-spline';
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
import { DxfWriterAdapter } from './dxf';
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

  loadSketch(sketchData, options: {strict?: boolean} = {}) {
    return this._loadSketch(JSON.parse(sketchData), options);
  }

  serializeSketch(metadata, options: {strict?: boolean} = {}) {
    const sketch = this._serializeSketch(metadata, options);
    if (options.strict === true) validateStrictSketch(sketch);
    return JSON.stringify(sketch);
  }

  _loadSketch(sketch: SketchFormat_V3, options: {strict?: boolean} = {}) {
    const strict = options.strict === true;
    if (strict) validateStrictSketch(sketch);
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
          } else if (type === BSpline.prototype.TYPE) {
            skobj = BSpline.read(obj.id, obj.data);
          }
          if (strict && skobj == null) throw new Error('Unknown sketch object type: ' + type);
          if (skobj != null) {
            skobj.role = obj.role;
            getStage(obj.stage).assignObject(skobj);
            sketchLayer.add(skobj);
            skobj.stabilize(this.viewer);
          }
        } catch (e) {
          if (strict) throw e;
          console.error(e);
          console.error('Failed loading ' + obj.type + ' ' + obj.id);
        }
      }

      const index = this.viewer.createIndex();

      for (const obj of sketch.dimensions) {
        try {
          const type = obj.type;
          let skobj = null;
          if (strict) validateStrictDimension(obj, index);
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
          if (strict && skobj === null) throw new Error('Unknown dimension type: ' + type);
          if (skobj !== null) {
            this.viewer.dimLayer.add(skobj);
          }
        } catch (e) {
          if (strict) throw e;
          console.error(e);
          console.error('Failed loading ' + obj.type + ' ' + obj.id);
        }
      }

      if (sketch.labels) {
        for (const obj of sketch.labels) {
          try {
            const type = obj.type;
            let skobj = null;
            if (strict) validateStrictLabel(obj, index);
            if (type === Label.prototype.TYPE) {
              skobj = Label.read(obj.id, obj.data, index);
            }
            if (strict && skobj === null) throw new Error('Unknown label type: ' + type);
            if (skobj !== null) {
              this.viewer.labelLayer.add(skobj);
            }
          } catch (e) {
            if (strict) throw e;
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
            if (strict) validateStrictConstraint(constr, index);
            const constraint = AlgNumConstraint.read(constr, index);
            stage.addConstraint(constraint);
          } catch (e) {
            if (strict) throw e;
            console.error(e);
            console.error(
              'skipping errant constraint: ' + constr && constr.typeId
            );
          }
        }
        for (const gen of dataStage.generators) {
          try {
            if (strict) validateStrictGenerator(gen, index);
            const generator = SketchGenerator.read(gen, index);
            if (strict) validateStrictGeneratorParams(gen, generator, index);
            stage.addGenerator(generator);
          } catch (e) {
            if (strict) throw e;
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

  _serializeSketch(metadata, options: {strict?: boolean} = {}) {
    const strict = options.strict === true;
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
          if (strict) throw e;
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
          if (strict) throw e;
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
      this.viewer.dimLayers
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
        if (obj instanceof Segment) {
          out.fline('<line x1="$" y1="$" x2="$" y2="$" />', [
            obj.a.x,
            obj.a.y,
            obj.b.x,
            obj.b.y,
          ]);
        } else if (obj instanceof Arc) {
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
        } else if (obj instanceof Circle) {
          out.fline('<circle cx="$" cy="$" r="$" />', [
            obj.c.x,
            obj.c.y,
            obj.r.get(),
          ]);
          //      } else if (obj.TYPE === T.DIM || obj.TYPE === T.HDIM || obj.TYPE === T.VDIM) {
        } else if (obj instanceof EllipticalArc) {
          a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
          b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
          const dir = a.cross(b).z > 0 ? 0 : 1;
          out.fline('<path d="M $ $ A $ $ $ $ 1 $ $" />', [
            obj.a.x,
            obj.a.y,
            obj.radiusX,
            obj.radiusY,
            obj.rotation / DEG_RAD,
            dir,
            obj.b.x,
            obj.b.y
          ]);
        } else if (obj instanceof Ellipse) {
          out.fline('<ellipse cx="$" cy="$" rx="$" ry="$" transform="rotate($, $ $)" />', [
            obj.c.x,
            obj.c.y,
            obj.radiusX,
            obj.radiusY,
            obj.rotation / DEG_RAD,
            obj.c.x,
            obj.c.y,
          ]);
        } else if (obj instanceof BezierCurve) {
          out.fline('<path d="M $ $ C $ $ $ $ $ $" />', [
            obj.a.x,
            obj.a.y,
            obj.cp1.x,
            obj.cp1.y,
            obj.cp2.x,
            obj.cp2.y,
            obj.b.x,
            obj.b.y
          ]);
        }
      }
      out.line('</g>');
    }
    bbox.inc(20);
    bbox.bbox[2] -= bbox.bbox[0];
    bbox.bbox[3] -= bbox.bbox[1];
    return (
      _format("<svg viewBox='$ $ $ $' transform='scale(1, -1)'>\n", bbox.bbox) + out.data + '</svg>'
    );
  }

  dxfExport() {
    const adapter = new DxfWriterAdapter();
    adapter.export(this.getLayersToExport());
    return adapter.stringify();
  }
}


// Strict mode is used by history restoration. It rejects data the permissive
// importer would otherwise skip or turn into references to missing objects.
// This validates before cleanup where possible; callers must still roll back
// if a later constructor, generator or solver fails while restoring.
function strictRecord(value: any, what: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid ' + what);
}
function strictNumber(value: any, what: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid ' + what);
}
function strictPoint(value: any, what: string) {
  strictRecord(value, what);
  strictNumber(value.x, what + '.x');
  strictNumber(value.y, what + '.y');
}
function strictReference(id: any, index: any, what: string) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(index, id) || !index[id]) {
    throw new Error('Missing ' + what + ' reference: ' + String(id));
  }
}
function validateStrictSketch(sketch: any) {
  strictRecord(sketch, 'sketch');
  if (sketch.version !== 3) throw new Error('Unsupported sketch version: ' + String(sketch.version));
  for (const key of ['objects', 'dimensions', 'labels', 'stages']) {
    if (!Array.isArray(sketch[key])) throw new Error('Invalid sketch ' + key);
  }
  if (sketch.constants !== undefined && typeof sketch.constants !== 'string') {
    strictRecord(sketch.constants, 'constants');
    for (const value of Object.values(sketch.constants)) {
      if (typeof value !== 'string') throw new Error('Invalid sketch constant');
    }
  }
  const ids = new Set<string>();
  for (const group of ['objects', 'dimensions', 'labels']) {
    for (const obj of sketch[group]) {
      strictRecord(obj, group + ' entry');
      if (typeof obj.id !== 'string' || !obj.id || ids.has(obj.id) || typeof obj.type !== 'string' || !obj.type) {
        throw new Error('Invalid or duplicate ' + group + ' identifier/type');
      }
      ids.add(obj.id);
      strictRecord(obj.data, group + ' data');
      if (group === 'objects') {
        if (obj.stage !== undefined && (!Number.isInteger(obj.stage) || obj.stage < 0 || obj.stage >= sketch.stages.length)) throw new Error('Invalid object stage');
        validateStrictObject(obj);
      }
    }
  }
  for (const stage of sketch.stages) {
    strictRecord(stage, 'stage');
    if (!Array.isArray(stage.constraints) || !Array.isArray(stage.generators)) throw new Error('Invalid stage contents');
  }
}
function validateStrictObject(obj: any) {
  const d = obj.data;
  const type = obj.type;
  if (type === BSpline.prototype.TYPE) {
    if (!Array.isArray(d.cPoints) || !Array.isArray(d.fPoints) ||
        !Number.isInteger(d.degree) || d.degree < 1 || d.degree >= d.cPoints.length ||
        !Array.isArray(d.kValues) || d.kValues.length !== d.cPoints.length + d.degree + 1 ||
        !d.kValues.every((k, i) => Number.isFinite(k) && (i === 0 || d.kValues[i - 1] <= k) &&
          (i <= d.degree || k !== d.kValues[i - d.degree - 1])) ||
        d.kValues[d.degree] >= d.kValues[d.cPoints.length] ||
        typeof d.interpolation !== 'boolean' || typeof d.CVModel !== 'boolean' ||
        !['Clamped', 'Closed', 'Open'].includes(d.type) ||
        !Number.isInteger(d.method) || d.method < -1 || d.method > 2) {
      throw new Error('Invalid B-spline data');
    }
    for (const point of [...d.cPoints, ...d.fPoints]) strictPoint(point, 'B-spline point');
    if (d.closedBasePoints !== undefined) {
      if (!Array.isArray(d.closedBasePoints)) throw new Error('Invalid B-spline base points');
      for (const point of d.closedBasePoints) strictPoint(point, 'B-spline base point');
    }
    return;
  }
  const pointFields = type === Segment.prototype.TYPE ? ['a', 'b'] :
    type === EndPoint.prototype.TYPE ? [] :
    type === Arc.prototype.TYPE ? ['a', 'b', 'c'] :
    type === Circle.prototype.TYPE ? ['c'] :
    type === BezierCurve.prototype.TYPE ? ['cp1', 'cp2', 'cp3', 'cp4'] :
    type === Ellipse.prototype.TYPE || type === EllipticalArc.prototype.TYPE ?
      (d.ep1 ? ['ep1', 'ep2'] : ['c']).concat(type === EllipticalArc.prototype.TYPE ? ['a', 'b'] : []) : null;
  if (!pointFields) throw new Error('Unknown sketch object type: ' + type);
  if (type === EndPoint.prototype.TYPE) strictPoint(d, type);
  for (const field of pointFields) strictPoint(d[field], type + '.' + field);
  if (type === Circle.prototype.TYPE) strictNumber(d.r, type + '.r');
  if (type === Ellipse.prototype.TYPE || type === EllipticalArc.prototype.TYPE) {
    for (const field of d.ep1 ? ['r'] : ['rx', 'ry', 'rot']) strictNumber(d[field], type + '.' + field);
  }
}
function validateStrictDimension(obj: any, index: any) {
  const d = obj.data;
  if (obj.type === DiameterDimension.prototype.TYPE) {
    strictReference(d.obj, index, 'dimension');
    strictNumber(d.angle, 'dimension angle');
  } else if ([HDimension.prototype.TYPE, VDimension.prototype.TYPE, LinearDimension.prototype.TYPE, AngleBetweenDimension.prototype.TYPE].includes(obj.type)) {
    strictReference(d.a, index, 'dimension'); strictReference(d.b, index, 'dimension');
    strictNumber(d.offset, 'dimension offset');
    if (obj.type === AngleBetweenDimension.prototype.TYPE) {
      if (!Array.isArray(d.configuration)) throw new Error('Invalid dimension configuration');
      d.configuration.forEach(id => strictReference(id, index, 'dimension configuration'));
    }
  } else throw new Error('Unknown dimension type: ' + obj.type);
}
function validateStrictLabel(obj: any, index: any) {
  if (obj.type !== Label.prototype.TYPE) throw new Error('Unknown label type: ' + obj.type);
  if (typeof obj.data.text !== 'string') throw new Error('Invalid label text');
  strictNumber(obj.data.offsetX, 'label offsetX'); strictNumber(obj.data.offsetY, 'label offsetY');
  strictReference(obj.data.assignedObject, index, 'label');
}
function validateStrictConstraint(constr: any, index: any) {
  strictRecord(constr, 'constraint');
  if (typeof constr.typeId !== 'string' || !constr.typeId || !Array.isArray(constr.objects)) throw new Error('Invalid constraint');
  constr.objects.forEach(id => strictReference(id, index, 'constraint'));
  if (constr.constants !== undefined) strictRecord(constr.constants, 'constraint constants');
  if (constr.annotations !== undefined && !Array.isArray(constr.annotations)) throw new Error('Invalid constraint annotations');
}
function validateStrictGenerator(gen: any, index: any) {
  strictRecord(gen, 'generator');
  if (typeof gen.typeId !== 'string' || !gen.typeId) throw new Error('Invalid generator type');
  strictRecord(gen.params, 'generator parameters');
  if (!Array.isArray(gen.generatedObjects)) throw new Error('Invalid generator objects');
  gen.generatedObjects.forEach(id => strictReference(id, index, 'generator'));
}
function validateStrictGeneratorParams(gen: any, generator: any, index: any) {
  const fields = new Map(generator.schema.params.map(p => [p.name, p]));
  for (const key of Object.keys(gen.params)) {
    const field: any = fields.get(key);
    if (!field) throw new Error('Unknown generator parameter: ' + key);
    if (field.type === 'selection') {
      if (!Array.isArray(gen.params[key])) throw new Error('Invalid generator selection: ' + key);
      gen.params[key].forEach(id => strictReference(id, index, 'generator selection'));
    }
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
