import { Generator } from "./id-generator";
import { Layer, Viewer } from "./viewer2d";
import { Arc } from "./shapes/arc";
import { EndPoint } from "./shapes/point";
import { Segment } from "./shapes/segment";
import { Circle } from "./shapes/circle";
import { Ellipse } from "./shapes/ellipse";
import { EllipticalArc } from "./shapes/elliptical-arc";
import { BezierCurve } from "./shapes/bezier-curve";
import { BSpline, IBSplineOpts, BSplineType, ParameterMethod } from "./shapes/b-spline";
import {
  AngleBetweenDimension,
  DiameterDimension,
  Dimension,
  HDimension,
  LinearDimension,
  VDimension,
} from "./shapes/dim";
import Vector from "math/vector";
import exportTextData from "gems/exportTextData";
import { AlgNumConstraint, ConstraintSerialization } from "./constr/ANConstraints";
import { SketchGenerator } from "./generators/sketchGenerator";
import { BoundaryGeneratorSchema } from "./generators/boundaryGenerator";
import { ShapesTypes } from "./shapes/sketch-types";
import { SketchObject } from "./shapes/sketch-object";
import { Label } from "sketcher/shapes/label";
import { DxfWriterAdapter } from "./dxf";
import { DEG_RAD } from "math/commons";

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

  bSpline?: {
    points: any[];
    segments: any[];
  }[];

  boundary?: ExternalBoundary;
}

const maxPoints = 14;
const minPoints = 3;

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

  generateData(n: number) {
    this.cleanUpData();
    const sketchLayer = this.viewer.findLayerByName("sketch");
    for (let i = 0; i < 2 * n; ++i) {
      // makeSpline(200, sketchLayer, 0);
      // makeSpline(200, sketchLayer, 1);
      // makeSpline(200, sketchLayer, 2);
      makeClosedSpline(300, sketchLayer, 0);
      makeClosedSpline(300, sketchLayer, 1);
      makeClosedSpline(300, sketchLayer, 2);
      makeClosedSpline(300, sketchLayer, 3);
    }
  }

  _loadSketch(sketch: SketchFormat_V3) {
    this.cleanUpData();

    this.viewer.parametricManager.startTransaction();
    try {
      const getStage = (pointer) => {
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

      const sketchLayer = this.viewer.findLayerByName("sketch");
      // makeSpline(200, sketchLayer, 0);
      // makeSpline(200, sketchLayer, 1);
      // makeSpline(200, sketchLayer, 2);
      // makeClosedSpline(100, sketchLayer, 0);
      // makeClosedSpline(100, sketchLayer, 1);
      // makeClosedSpline(100, sketchLayer, 2);
      // makeClosedSpline(100, sketchLayer, 3);
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
          if (skobj != null) {
            skobj.role = obj.role;
            getStage(obj.stage).assignObject(skobj);
            sketchLayer.add(skobj);
            skobj.stabilize(this.viewer);
          }
        } catch (e) {
          console.error(e);
          console.error("Failed loading " + obj.type + " " + obj.id);
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
            skobj = LinearDimension.load(LinearDimension, obj.id, obj.data, index);
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
          console.error("Failed loading " + obj.type + " " + obj.id);
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
            console.error("Failed loading " + obj.type + " " + obj.id);
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
            console.error("skipping errant constraint: " + constr && constr.typeId);
          }
        }
        for (const gen of dataStage.generators) {
          try {
            const generator = SketchGenerator.read(gen, index);
            stage.addGenerator(generator);
          } catch (e) {
            console.error(e);
            console.error("skipping errant generator: " + gen && gen.typeId);
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
      BoundaryGeneratorSchema,
    );

    this.viewer.parametricManager.addGeneratorToStage(boundaryGenerator, this.viewer.parametricManager.groundStage);
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
      bSpline: [],
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
          if (obj instanceof BSpline) {
            const points = [];
            for (const point of obj.fPoints) {
              points.push([point.x, point.y]);
            }
            // const segments = obj.bsplineToBezierSegments();
            // sketch.bSpline.push({points, segments});
            const segments = [];
            const segs = obj.bsplineToBezierSegments_full();
            for (const seg of segs) {
              segments.push({
                a: { x: seg.cps[0].x, y: seg.cps[0].y },
                cp1: { x: seg.cps[1].x, y: seg.cps[1].y },
                cp2: { x: seg.cps[2].x, y: seg.cps[2].y },
                b: { x: seg.cps[0].x, y: seg.cps[0].y },
              });
            }
            sketch.bSpline.push({ points, segments });
          } else {
            sketch.objects.push({
              id: obj.id,
              type: obj.TYPE,
              role: obj.role,
              stage: this.viewer.parametricManager.getStageIndex(obj.stage),
              data: obj.write(),
            });
          }
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
    return [this.viewer.layers, [this.viewer.labelLayer], this.viewer.dimLayers];
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
      out.fline('<g id="$" fill="$" stroke="$" stroke-width="$">', [layer.name, "none", color, "2"]);
      for (let i = 0; i < layer.objects.length; ++i) {
        const obj = layer.objects[i];
        if (obj.TYPE !== T.POINT) bbox.check(obj);
        if (obj instanceof Segment) {
          out.fline('<line x1="$" y1="$" x2="$" y2="$" />', [obj.a.x, obj.a.y, obj.b.x, obj.b.y]);
        } else if (obj instanceof Arc) {
          a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
          b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
          const dir = a.cross(b).z > 0 ? 0 : 1;
          const r = obj.r.get();
          out.fline('<path d="M $ $ A $ $ 0 $ $ $ $" />', [obj.a.x, obj.a.y, r, r, dir, 1, obj.b.x, obj.b.y]);
        } else if (obj instanceof Circle) {
          out.fline('<circle cx="$" cy="$" r="$" />', [obj.c.x, obj.c.y, obj.r.get()]);
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
            obj.b.y,
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
            obj.b.y,
          ]);
        }
      }
      out.line("</g>");
    }
    bbox.inc(20);
    bbox.bbox[2] -= bbox.bbox[0];
    bbox.bbox[3] -= bbox.bbox[1];
    return _format("<svg viewBox='$ $ $ $' transform='scale(1, -1)'>\n", bbox.bbox) + out.data + "</svg>";
  }

  dxfExport() {
    const adapter = new DxfWriterAdapter();
    adapter.export(this.getLayersToExport());
    return adapter.stringify();
  }
}

function _format(str, args) {
  if (args.length == 0) return str;
  let i = 0;
  return str.replace(/\$/g, function () {
    if (args === undefined || args[i] === undefined) throw "format arguments mismatch";
    let val = args[i];
    if (typeof val === "number") val = val.toPrecision();
    i++;
    return val;
  });
}

/** @constructor */
function PrettyColors() {
  const colors = ["#000000", "#00008B", "#006400", "#8B0000", "#FF8C00", "#E9967A"];
  let colIdx = 0;
  this.next = function () {
    return colors[colIdx++ % colors.length];
  };
}

/** @constructor */
function TextBuilder() {
  this.data = "";
  this.fline = function (chunk, args) {
    this.data += _format(chunk, args) + "\n";
  };
  this.line = function (chunk) {
    this.data += chunk + "\n";
  };
  this.number = function (n) {
    this.data += n.toPrecision();
  };
  this.numberln = function (n) {
    this.number(n);
    this.data += "\n";
  };
}

/** @constructor */
function BBox() {
  const bbox = [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];

  const T = ShapesTypes;

  this.checkLayers = function (layers) {
    for (let l = 0; l < layers.length; ++l)
      for (let i = 0; i < layers[l].objects.length; ++i) this.check(layers[l].objects[i]);
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
      this.checkCircBounds(obj.centerX, obj.centerY, Math.max(obj.radiusX, obj.radiusY));
    } else if (obj) {
      obj.accept((o) => {
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

/**

生成一条随机插值点曲线样本

@param numPoints 插值点数量（默认 3~16 随机）

@param width x 范围（默认 1000）

@param height y 范围（默认 600）

@param noiseY y方向波动比例（0~1，越大越随机）
*/
function generateRandomCurveSample(
  numPoints?: number,
  width: number = 1000,
  height: number = 600,
  noiseY: number = 0.4,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * maxPoints) + minPoints; // 3~16 点
  const points: EndPoint[] = [];

  // 生成递增的 x 坐标
  const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * width);

  // y 基准为随机初始值 + 累积偏移
  let baseY = Math.random() * height * 0.5 + height * 0.25;
  let direction = Math.random() < 0.5 ? 1 : -1;

  for (let i = 0; i < n; i++) {
    const jitter = (Math.random() - 0.5) * 2 * noiseY * height * 0.5;
    baseY += direction * (Math.random() * height * 0.1);
    direction *= Math.random() < 0.3 ? -1 : 1; // 偶尔反向，避免单调
    const y = Math.min(Math.max(baseY + jitter, 0), height);
    points.push(new EndPoint(xs[i], y));
  }

  return points;
}

/**

批量生成随机曲线样本集

@param count 样本数量
*/
function generateCurveDataset(count: number): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateRandomCurveSample());
  }
  return dataset;
}

/**

生成一条完全随机的插值点曲线样本

x 与 y 都在正负范围内，点分布均匀但随机

@param numPoints 插值点数量（默认 5~12）

@param width x 范围（默认 1000）

@param height y 范围（默认 600）

@param noise 随机扰动强度（0~1，越大越发散）
*/
function generateFullyRandomCurveSample(
  numPoints?: number,
  width: number = 1000,
  height: number = 600,
  noise: number = 0.6,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * maxPoints) + minPoints; // 3~16 点
  const points: EndPoint[] = [];

  for (let i = 0; i < n; i++) {
    // 在 [-0.5, 0.5] 范围内生成随机点，再乘范围
    let x = (Math.random() - 0.5) * 2 * width * (0.5 + Math.random() * noise);
    let y = (Math.random() - 0.5) * 2 * height * (0.5 + Math.random() * noise);

    // 添加轻微相关性（让点略微连续）
    if (i > 0) {
      const prev = points[i - 1];
      x = prev.x + (Math.random() - 0.5) * width * 0.3 * noise;
      y = prev.y + (Math.random() - 0.5) * height * 0.3 * noise;
    }

    points.push(new EndPoint(x, y));
  }

  return points;
}

/**

批量生成完全随机曲线样本集

@param count 样本数量
*/
function generateFullyRandomDataset(count: number): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateFullyRandomCurveSample());
  }
  return dataset;
}

function generateDataset(count: number, fun: any): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(fun());
  }
  return dataset;
}

/**

生成一条首尾相连的闭合随机插值点曲线样本

@param numPoints 插值点数量（默认 6~12）

@param radius 半径范围（默认 300）

@param noise 随机扰动比例（0~1）
*/
function generateClosedRandomCurveSample(numPoints?: number, radius: number = 200, noise: number = 0.7): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * (maxPoints - 1)) + minPoints; // 6~12 点
  const points: EndPoint[] = [];

  for (let i = 0; i < n; i++) {
    const theta = (i / n) * 2 * Math.PI; // 均匀分布角度
    const r = radius * (1 + (Math.random() - 0.5) * 2 * noise); // 添加半径扰动
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    points.push(new EndPoint(x, y));
  }

  // 闭合：首尾点相同
  points.push(points[0]);

  return points;
}

/**

批量生成闭合曲线样本集

@param count 样本数量
*/
function generateClosedCurveDataset(count: number): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateClosedRandomCurveSample());
  }
  return dataset;
}

/**

生成一条更加随机的首尾相连闭合插值点曲线样本

特点：点随机分布在环形区域，形状不规则但首尾闭合

@param numPoints 插值点数量（默认 6~14）

@param radius 平均半径（默认 300）

@param noise 半径扰动比例（0~1）

@param chaos 角度扰动比例（0~1，越大越不均匀）
*/
function generateFullyRandomClosedCurveSample(
  numPoints?: number,
  radius: number = 300,
  noise: number = 0.6,
  chaos: number = 0.4,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * (maxPoints - 1)) + minPoints; // 6~14 点
  const rawPoints: { x: number; y: number; angle: number }[] = [];

  // 随机生成点（极坐标 -> 笛卡尔坐标）
  for (let i = 0; i < n; i++) {
    // 角度随机但略分布在[0, 2π)
    const theta = (i / n) * 2 * Math.PI + (Math.random() - 0.5) * 2 * Math.PI * chaos;

    // 半径带随机扰动
    const r = radius * (1 + (Math.random() - 0.5) * 2 * noise);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    rawPoints.push({ x, y, angle: theta });
  }

  // 为了形成顺滑闭合形状：按角度排序
  rawPoints.sort((a, b) => a.angle - b.angle);

  const points: EndPoint[] = rawPoints.map((p) => new EndPoint(p.x, p.y));

  // 闭合曲线：首尾点一致
  points.push(points[0]);

  return points;
}

/**

批量生成更加随机的闭合曲线样本集

@param count 样本数量
*/
function generateFullyRandomClosedDataset(count: number): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateFullyRandomClosedCurveSample());
  }
  return dataset;
}

/**

生成一个更加随机的首尾闭合插值点曲线样本

x 与 y 均为正负范围随机值，并自动闭合（首尾点相同）

@param numPoints 插值点数量（默认 5~12）

@param radius 曲线的平均半径范围（默认 300）

@param noise 随机扰动强度（0~1）

@param rotation 随机旋转角度范围（弧度）
*/
export function generateHighlyRandomClosedCurveSample(
  numPoints?: number,
  radius: number = 300,
  noise: number = 0.8,
  rotation: number = Math.random() * Math.PI * 2,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * (maxPoints - 1)) + minPoints; // 5~12点
  const points: EndPoint[] = [];

  // 每个点按极坐标生成，加入扰动和旋转
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rotation;
    const r = radius * (0.5 + Math.random() * 0.8); // 半径有随机波动
    const nx = Math.cos(angle) * r + (Math.random() - 0.5) * radius * noise;
    const ny = Math.sin(angle) * r + (Math.random() - 0.5) * radius * noise;
    points.push(new EndPoint(nx, ny));
  }

  // 添加首尾闭合点
  points.push(points[0]);

  return points;
}

/**

批量生成闭合随机曲线数据集

@param count 样本数量
*/
export function generateHighlyRandomClosedDataset(count: number): EndPoint[][] {
  const dataset: EndPoint[][] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateHighlyRandomClosedCurveSample());
  }
  return dataset;
}

/**

生成开放随机插值点曲线样本

曲线不会闭合，形态更自然
*/
export function generateRandomOpenCurveSample(
  numPoints?: number,
  range: number = 400,
  noise: number = 0.8,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * maxPoints) + minPoints; // 3~12点
  const points: EndPoint[] = [];

  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    // 每个点在随机方向上累积偏移
    x += (Math.random() - 0.5) * range * noise;
    y += (Math.random() - 0.5) * range * noise;
    points.push(new EndPoint(x, y));
  }

  return points;
}

/**

生成闭合随机插值点曲线样本

x 与 y 均为正负范围随机值，并自动闭合（首尾点相同）
*/
export function generateRandomClosedCurveSample(
  numPoints?: number,
  radius: number = 300,
  noise: number = 0.8,
  rotation: number = Math.random() * Math.PI * 2,
): EndPoint[] {
  const n = numPoints ?? Math.floor(Math.random() * (maxPoints - 1)) + minPoints; // 5~12点
  const points: EndPoint[] = [];

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rotation;
    const r = radius * (0.5 + Math.random() * 0.8);
    const nx = Math.cos(angle) * r + (Math.random() - 0.5) * radius * noise;
    const ny = Math.sin(angle) * r + (Math.random() - 0.5) * radius * noise;
    points.push(new EndPoint(nx, ny));
  }

  // 首尾闭合
  points.push(points[0]);
  return points;
}

function makeSpline(count: number, sketchLayer, random: number) {
  let dataset;
  if (random === 1) {
    dataset = generateFullyRandomDataset(count);
  } else if (random === 2) {
    dataset = generateDataset(count, generateRandomOpenCurveSample);
  } else if (random === 0) {
    dataset = generateCurveDataset(count);
  }
  const degree = 3;
  const curveType = BSplineType.Clamped;
  const method = ParameterMethod.Centripetal;
  for (const fPoints of dataset) {
    const kValues = [
      ...new Array(degree).fill(0.0),
      ...new Array(fPoints.length).fill(1.0),
      ...new Array(degree).fill(1.0),
    ];
    const cPoints = [
      ...new Array(Math.floor((degree - 1) / 2)).fill(fPoints[0]),
      ...fPoints,
      ...new Array(Math.floor(degree / 2)).fill(fPoints[fPoints.length - 1]),
    ];
    const opts = {
      degree: degree,
      cPoints: cPoints,
      fPoints: fPoints,
      kValues: kValues,
      interpolation: true,
      CVModel: false,
      type: curveType,
      method: method,
    };
    const curve = new BSpline(opts);
    curve.update(curveType, method);
    sketchLayer.add(curve);
  }
}

function makeClosedSpline(count: number, sketchLayer, random: number) {
  let dataset;
  if (random === 1) {
    dataset = generateFullyRandomClosedDataset(count);
  } else if (random === 2) {
    dataset = generateHighlyRandomClosedDataset(count);
  } else if (random === 0) {
    dataset = generateClosedCurveDataset(count);
  } else if (random === 3) {
    dataset = generateDataset(count, generateRandomClosedCurveSample);
  }
  const degree = 3;
  const curveType = BSplineType.Closed;
  const method = ParameterMethod.QuasiUniform;
  for (const fPoints of dataset) {
    const cPoints = [];
    const num = fPoints.length + 2 * degree;
    const kValues = [...Array.from({ length: num }, (_, i) => i / (num - 1))];
    for (let i = 0; i < num - degree - 1; ++i) {
      cPoints.push(fPoints[i % fPoints.length]);
    }
    const opts = {
      degree: degree,
      cPoints: cPoints,
      fPoints: fPoints,
      kValues: kValues,
      interpolation: true,
      CVModel: false,
      type: curveType,
      method: method,
    };
    const curve = new BSpline(opts);
    curve.update(curveType, method);
    sketchLayer.add(curve);
  }
}
