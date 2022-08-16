import {Generator} from './id-generator'
import {Viewer} from './viewer2d'
import {Arc} from './shapes/arc'
import {EndPoint} from './shapes/point'
import {Segment} from './shapes/segment'
import {Circle} from './shapes/circle'
import {Ellipse} from './shapes/ellipse'
import {EllipticalArc} from './shapes/elliptical-arc'
import {BezierCurve} from './shapes/bezier-curve'
import {
  AngleBetweenDimension,
  DiameterDimension,
  Dimension,
  HDimension,
  LinearDimension,
  VDimension
} from './shapes/dim'
import Vector from 'math/vector';
import exportTextData from 'gems/exportTextData';
import {AlgNumConstraint, ConstraintSerialization} from "./constr/ANConstraints";
import {SketchGenerator} from "./generators/sketchGenerator";
import {BoundaryGeneratorSchema} from "./generators/boundaryGenerator";
import {SketchTypes} from "./shapes/sketch-types";
import {SketchObject} from "./shapes/sketch-object";
import {Label} from "sketcher/shapes/label";
import Drawing from 'dxf-writer';
import {DEG_RAD} from "math/commons";


export interface SketchFormat_V3 {

  version: number;

  objects: {
    id: string,
    type: string,
    role: string,
    stage: number,
    data: any
  }[];

  dimensions: {
    id: string,
    type: string,
    data: any
  }[];

  labels: {
    id: string,
    type: string,
    data: any
  }[];

  stages: {

    generators: {
      typeId: string
    }[];

    constraints: ConstraintSerialization[];

  }[];

  constants: {
    [key: string]: string;
  };

  metadata: any;

  boundary?: ExternalBoundary

}

class ExternalBoundary {

}


export class IO {

  static exportTextData = exportTextData

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
      for (let obj of sketch.objects) {
        try {
          let skobj: SketchObject = null;
          let type = obj.type;

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
          console.error("Failed loading " + obj.type + " " + obj.id);
        }
      }

      const index = this.viewer.createIndex();

      for (let obj of sketch.dimensions) {
        try {
          let type = obj.type;
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
        for (let obj of sketch.labels) {
          try {
            let type = obj.type;
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
        let dataStage = sketch.stages[i];
        let stage = getStage(i);
        for (let constr of dataStage.constraints) {
          try {
            const constraint = AlgNumConstraint.read(constr, index);
            stage.addConstraint(constraint)
          } catch (e) {
            console.error(e);
            console.error("skipping errant constraint: " + constr && constr.typeId);
          }
        }
        for (let gen of dataStage.generators) {
          try {
            const generator = SketchGenerator.read(gen, index);
            stage.addGenerator(generator)
          } catch (e) {
            console.error(e);
            console.error("skipping errant generator: " + gen && gen.typeId);
          }
        }
      }

      let constants = sketch.constants;
      if (constants !== undefined) {
        this.viewer.parametricManager.$constantDefinition.next(constants);
      }

    } finally {
      this.viewer.parametricManager.finishTransaction();
      this.viewer.parametricManager.notify();
    }

  };


  createBoundaryObjects(boundary) {

    const boundaryGenerator = new SketchGenerator({
      boundaryData: boundary
    }, BoundaryGeneratorSchema);

    this.viewer.parametricManager.addGeneratorToStage(boundaryGenerator, this.viewer.parametricManager.groundStage);
  }

  cleanUpData() {
    for (let l = 0; l < this.viewer.layers.length; ++l) {
      let layer = this.viewer.layers[l];
      if (layer.objects.length !== 0) {
        layer.objects = [];
      }
    }
    this.viewer.deselectAll();
    Generator.resetIDGenerator(0);

    this.viewer.parametricManager.reset();
    this.viewer.parametricManager.notify();

  };

  _serializeSketch(metadata) {

    const sketch: SketchFormat_V3 = {
      version: 3,
      objects: [],
      dimensions: [],
      labels: [],
      stages: [],
      constants: this.viewer.parametricManager.constantDefinition,
      metadata
    };

    for (let layer of this.viewer.layers) {
      for (let obj of layer.objects) {
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
            data: obj.write()
          });
        } catch (e) {
          console.error(e);
        }
      }
    }

    function pushObjectsFromLayer(layer, into) {
      for (let obj of layer.objects) {
        try {
          into.push({
            id: obj.id,
            type: obj.TYPE,
            data: obj.write()
          });
        } catch (e) {
          console.error(e);
        }
      }

    }
    pushObjectsFromLayer(this.viewer.dimLayer, sketch.dimensions);
    pushObjectsFromLayer(this.viewer.labelLayer, sketch.labels);

    for (let stage of this.viewer.parametricManager.stages) {
      const stageOut = {
        constraints: [],
        generators: [],
      };
      const systemConstraints = stage.algNumSystem.allConstraints;
      for (let sc of systemConstraints) {
        if (!sc.internal) {
          stageOut.constraints.push(sc.write());
        }
      }

      for (let gen of stage.generators) {
        if (gen.internal) {
          continue;
        }
        stageOut.generators.push(gen.write());
      }

      sketch.stages.push(stageOut);
    }

    return sketch;
  };

  getWorkspaceToExport() {
    return [this.viewer.layers, [this.viewer.labelLayer]];
  };

  getLayersToExport() {
    let ws = this.getWorkspaceToExport();
    let toExport = [];
    for (let t = 0; t < ws.length; ++t) {
      let layers = ws[t];
      for (let l = 0; l < layers.length; ++l) {
        let layer = layers[l];
        toExport.push(layer)
      }
    }
    return toExport;
  }

  svgExport() {

    let T = SketchTypes;
    let out = new TextBuilder();

    let bbox = new BBox();

    let a = new Vector();
    let b = new Vector();

    let prettyColors = new PrettyColors();
    let toExport = this.getLayersToExport();
    for (let l = 0; l < toExport.length; ++l) {
      let layer = toExport[l];
      let color = prettyColors.next();
      out.fline('<g id="$" fill="$" stroke="$" stroke-width="$">', [layer.name, "none", color, '2']);
      for (let i = 0; i < layer.objects.length; ++i) {
        let obj = layer.objects[i];
        if (obj._class !== T.POINT) bbox.check(obj);
        if (obj._class === T.SEGMENT) {
          out.fline('<line x1="$" y1="$" x2="$" y2="$" />', [obj.a.x, obj.a.y, obj.b.x, obj.b.y]);
        } else if (obj._class === T.ARC) {
          a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
          b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
          let dir = a.cross(b).z > 0 ? 0 : 1;
          let r = obj.r.get();
          out.fline('<path d="M $ $ A $ $ 0 $ $ $ $" />', [obj.a.x, obj.a.y, r, r, dir, 1, obj.b.x, obj.b.y]);
        } else if (obj._class === T.CIRCLE) {
          out.fline('<circle cx="$" cy="$" r="$" />', [obj.c.x, obj.c.y, obj.r.get()]);
          //      } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
        }
      }
      out.line('</g>');
    }
    bbox.inc(20);
    return _format("<svg viewBox='$ $ $ $'>\n", bbox.bbox) + out.data + "</svg>"
  };

   dxfExport() {

     // defines as any since library doesn't provide types correctly
     let d: any = new Drawing();

     let T = SketchTypes;

     let toExport = this.getLayersToExport();

     d.setUnits('Millimeters');

     for (let l = 0; l < toExport.length; l++) {
       const layer = toExport[l];
       const dxfLayerId = l + '_green';
       d.addLayer(dxfLayerId, Drawing.ACI.GREEN, 'CONTINUOUS');
       d.setActiveLayer(dxfLayerId);

       for (let i = 0; i < layer.objects.length; ++i) {
         let obj = layer.objects[i];
         console.debug("exporting object", obj);

         if (obj._class === T.POINT) {
           d.drawPoint(obj.x, obj.y);
         } else if (obj._class === T.SEGMENT) {
           d.drawLine(obj.a.x, obj.a.y, obj.b.x, obj.b.y);
         } else if (obj._class === T.ARC) {
           d.drawArc(
             obj.c.x,
             obj.c.y,
             obj.r.get(),
             (obj.getStartAngle() / DEG_RAD),
             (obj.getEndAngle() / DEG_RAD));
         } else if (obj._class === T.CIRCLE) {
           d.drawCircle(obj.c.x, obj.c.y, obj.r.get());
         } else if (obj._class === T.ELLIPSE) {
           const majorX = Math.cos(obj.rotation) * obj.radiusX;
           const majorY = Math.sin(obj.rotation) * obj.radiusX;
           d.drawEllipse(obj.centerX, obj.centerY, majorX, majorY, obj.radiusY / obj.radiusX, 0, 2 * Math.PI);
         } else if (obj._class === T.BEZIER) {
           d.drawSpline([
             [obj.p0.x, obj.p0.y],
             [obj.p1.x, obj.p1.y],
             [obj.p2.x, obj.p2.y],
             [obj.p3.x, obj.p3.y],
           ], 3)
         } else if (obj._class === T.LABEL) {
           const m = obj.assignedObject.labelCenter;
           if (!m) {
             return;
           }
           const height = obj.textHelper.textMetrics.height;
           const h = obj.textHelper.textMetrics.width/2;
           const lx = m.x - h + obj.offsetX;
           const ly = m.y + obj.marginOffset  + obj.offsetY;

           d.drawText(lx, ly, height, 0, obj.text);

         } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
         }
       }
     }
    //console.log(d.toDxfString());
    d.generateAutocadExtras();
    return d.toDxfString();
  };
}

function _format(str, args) {
  if (args.length == 0) return str;
  let i = 0;
  return str.replace(/\$/g, function () {
    if (args === undefined || args[i] === undefined) throw "format arguments mismatch";
    let val = args[i];
    if (typeof val === 'number') val = val.toPrecision();
    i++;
    return val;
  });
}

/** @constructor */
function PrettyColors() {
  let colors = ["#000000", "#00008B", "#006400", "#8B0000", "#FF8C00", "#E9967A"];
  let colIdx = 0;
  this.next = function () {
    return colors[colIdx++ % colors.length];
  }
}

/** @constructor */
function TextBuilder() {
  this.data = "";
  this.fline = function (chunk, args) {
    this.data += _format(chunk, args) + "\n"
  };
  this.line = function (chunk) {
    this.data += chunk + "\n"
  };
  this.number = function (n) {
    this.data += n.toPrecision()
  };
  this.numberln = function (n) {
    this.number(n)
    this.data += "\n"
  }
}

/** @constructor */
function BBox() {
  let bbox = [Number.MAX_VALUE, Number.MAX_VALUE, - Number.MAX_VALUE, - Number.MAX_VALUE];

  let T = SketchTypes;

  this.checkLayers = function (layers) {
    for (let l = 0; l < layers.length; ++l)
      for (let i = 0; i < layers[l].objects.length; ++i)
        this.check(layers[l].objects[i]);
  };

  this.check = function (obj) {
    if (obj._class === T.SEGMENT) {
      this.checkBounds(obj.a.x, obj.a.y);
      this.checkBounds(obj.b.x, obj.b.y);
    } else if (obj._class === T.POINT) {
      this.checkBounds(obj.x, obj.y);
    } else if (obj._class === T.ARC) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj._class === T.CIRCLE) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj._class === T.ELLIPSE || obj._class === T.ELL_ARC) {
      this.checkCircBounds(obj.centerX, obj.centerY, Math.max(obj.radiusX, obj.radiusY));
    } else if (obj) {
      obj.accept((o) => {
        if (o._class == T.POINT) {
          this.checkBounds(o.x, o.y);
        }
        return true;
      });
      //    } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
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