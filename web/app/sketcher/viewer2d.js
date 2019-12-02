import {Styles} from './styles';
import {Bus, Parameters} from '../ui/toolkit';
import {ParametricManager} from './parametric';
import {HistoryManager} from './history';
import {ToolManager} from './tools/manager';
import {PanTool} from './tools/pan';
import {Segment} from './shapes/segment';
import {EndPoint} from './shapes/point';
import {Point} from './shapes/primitives';
import {ReferencePoint} from './shapes/reference-point';
import {BasisOrigin} from './shapes/basis-origin';
import Vector from 'math/vector';

import * as draw_utils from './shapes/draw-utils';
import {Matrix3} from '../math/l3space';
import sketcherStreams from './sketcherStreams';


class Viewer {

  constructor(canvas, IO) {

    // 1/1000'' aka 1 mil is a standard precision for the imperial system(for engeneering) 
    // this precision also covers the metric system which is supposed to be ~0.01
    // this field is used only for displaying purposes now, although in future it could be
    // used to keep all internal data with such precision transforming the input from user
    this.presicion = 3;
    this.canvas = canvas;
    this.params = new Parameters();
    this.io = new IO(this);
    this.streams = sketcherStreams(this);
    var viewer = this;
    this.retinaPxielRatio = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;

    function updateCanvasSize() {
      var canvasWidth = canvas.parentNode.offsetWidth;
      var canvasHeight = canvas.parentNode.offsetHeight;

      canvas.width = canvasWidth * viewer.retinaPxielRatio;
      canvas.height = canvasHeight * viewer.retinaPxielRatio;

      canvas.style.width = canvasWidth + "px";
      canvas.style.height = canvasHeight + "px";
    }

    this.onWindowResize = function () {
      updateCanvasSize();
      viewer.refresh();
    };
    updateCanvasSize();
    window.addEventListener('resize', this.onWindowResize, false);

    Object.defineProperty(this, "activeLayer", {
      get: viewer.getActiveLayer,
      set: viewer.setActiveLayer
    });

    this.bus = new Bus();
    this.ctx = this.canvas.getContext("2d");
    this._activeLayer = null;
    this.layers = [
      this.createLayer("sketch", Styles.DEFAULT)
      // this.createLayer("_construction_", Styles.CONSTRUCTION) 
    ];
    this.dimLayer = this.createLayer("_dim", Styles.DIM);
    this.dimLayers = [this.dimLayer];
    this.bus.defineObservable(this, 'dimScale', 1);
    this.bus.subscribe('dimScale', function () {
      viewer.refresh();
    });

    this._workspace = [this.layers, this.dimLayers];

    this.referencePoint = new ReferencePoint();
    this._serviceWorkspace = [this._createServiceLayers()];

    this.toolManager = new ToolManager(this, new PanTool(this));
    this.parametricManager = new ParametricManager(this);

    this.translate = {x: 0.0, y: 0.0};
    this.scale = 1.0;

    this.selected = [];
    this.snapped = null;

    this.historyManager = new HistoryManager(this);
    this.transformation = null;
    this.screenToModelMatrix = null;
    this.refresh();
  }

  dispose() {
    window.removeEventListener('resize', this.onWindowResize, false);
    this.canvas = null;
    this.toolManager.dispose();
  };

  isDisposed() {
    return this.canvas === null;
  };

  setTransformation(a, b, c, d, e, f, zoom) {
    this.transformation = [a, b, c, d, e, f];
    this.scale = zoom;
    if (this.screenToModelMatrix === null) {
      this.screenToModelMatrix = new Matrix3();
    }
    this.screenToModelMatrix.set34(
      a, c, 0, e,
      b, d, 0, f,
      0, 0, 1, 0
    )._invert();
  };

  roundToPrecision(value) {
    return value.toFixed(this.presicion);
  };

  addSegment(x1, y1, x2, y2, layer) {
    var a = new EndPoint(x1, y1);
    var b = new EndPoint(x2, y2);
    var line = new Segment(a, b);
    layer.add(line);
    return line;
  };

  remove(obj) {
    this.removeAll([obj]);
  };

  removeAll(objects) {
    this.parametricManager.removeObjects(objects);
  };

  add(obj, layer) {
    layer.add(obj);
  };

  search(x, y, buffer, deep, onlyPoints, filter) {

    buffer *= 0.5;

    var pickResult = [];
    var aim = new Vector(x, y);

    var heroIdx = 0;
    var unreachable = buffer * 2;
    var heroLength = unreachable; // unreachable

    function isFiltered(o) {
      for (var i = 0; i < filter.length; ++i) {
        if (filter[i] === o) return true;
      }
      return false;
    }

    for (var i = 0; i < this.layers.length; i++) {
      var objs = this.layers[i].objects;
      for (var j = 0; j < objs.length; j++) {
        var l = unreachable + 1;
        var before = pickResult.length;
        objs[j].accept((o) => {
          if (!o.visible) return true;
          if (onlyPoints && !isEndPoint(o)) {
            return true;
          }
          l = o.normalDistance(aim, this.scale);
          if (l >= 0 && l <= buffer && !isFiltered(o)) {
            pickResult.push(o);
            return false;
          }
          return true;
        });
        var hit = before - pickResult.length != 0;
        if (hit) {
          if (!deep && pickResult.length != 0) return pickResult;
          if (l >= 0 && l < heroLength) {
            heroLength = l;
            heroIdx = pickResult.length - 1;
          }
        }
      }
    }
    if (pickResult.length > 0) {
      var _f = pickResult[0];
      pickResult[0] = pickResult[heroIdx];
      pickResult[heroIdx] = _f;
    }
    return pickResult;
  };

  _createServiceLayers() {
    let layer = this.createLayer("_service", Styles.SERVICE);
//  layer.objects.push(new CrossHair(0, 0, 20));
    layer.objects.push(new Point(0, 0, 2));
    layer.objects.push(this.referencePoint);
    layer.objects.push(new BasisOrigin(null, this));
    return [layer];

  };

  refresh() {
    const viewer = this;
    window.requestAnimationFrame(function () {
      if (!viewer.isDisposed()) {
        viewer.repaint();
      }
    });
  };

  repaint() {

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.transform(1, 0, 0, -1, 0, this.canvas.height);

    if (this.transformation) {
      let [a, b, c, d, e, f] = this.transformation;
      ctx.transform(a, b, c, d, e, f);
    } else {
      ctx.transform(1, 0, 0, 1, this.translate.x, this.translate.y);
      ctx.transform(this.scale, 0, 0, this.scale, 0, 0);
    }

    this.__prevStyle = null;

    this.__drawWorkspace(ctx, this._workspace, Viewer.__SKETCH_DRAW_PIPELINE);
    this.__drawWorkspace(ctx, this._serviceWorkspace, Viewer.__SIMPLE_DRAW_PIPELINE);
  };

  __drawWorkspace(ctx, workspace, pipeline) {
    for (let drawPredicate of pipeline) {
      for (let layers of workspace) {
        for (let layer of layers) {
          for (let obj of layer.objects) {
            obj.accept((obj) => {
              if (!obj.visible) return true;
              if (drawPredicate(obj)) {
                this.__draw(ctx, layer, obj);
              }
              return true;
            });
          }
        }
      }
    }
  };

  __draw(ctx, layer, obj) {
    const style = this.getStyleForObject(layer, obj);
    if (style !== this.__prevStyle) {
      this.setStyle(style, ctx);
    }
    this.__prevStyle = style;
    obj.draw(ctx, this.scale / this.retinaPxielRatio, this);
  };

  getStyleForObject(layer, obj) {
    if (obj.style != null) {
      return obj.style;
    } else if (obj.role != null) {
      const style = layer.stylesByRoles[obj.role];
      if (style) {
        return style;
      }
    }
    return layer.style;
  };

  setStyle(style, ctx) {
    draw_utils.SetStyle(style, ctx, this.scale / this.retinaPxielRatio);
  };

  snap(x, y, excl) {
    this.cleanSnap();
    var snapTo = this.search(x, y, 20 / this.scale, true, true, excl);
    if (snapTo.length > 0) {
      this.snapped = snapTo[0];
      this.mark(this.snapped, Styles.SNAP);
    }
    return this.snapped;
  };

  cleanSnap() {
    if (this.snapped != null) {
      this.deselect(this.snapped);
      this.snapped = null;
    }
  };

  showBounds(x1, y1, x2, y2, offset) {
    var dx = Math.max(x2 - x1, 1);
    var dy = Math.max(y2 - y1, 1);
    if (this.canvas.width > this.canvas.height) {
      this.scale = this.canvas.height / dy;
    } else {
      this.scale = this.canvas.width / dx;
    }
    this.translate.x = -x1 * this.scale;
    this.translate.y = -y1 * this.scale;
  };

  screenToModel2(x, y, out) {
    out.x = x * this.retinaPxielRatio;
    out.y = this.canvas.height - y * this.retinaPxielRatio;

    if (this.transformation) {
      out.z = 0;
      this.screenToModelMatrix._apply(out);
    } else {
      out.x -= this.translate.x;
      out.y -= this.translate.y;

      out.x /= this.scale;
      out.y /= this.scale;
    }
  };

  screenToModel(e) {
    return this._screenToModel(e.offsetX, e.offsetY);
  };

  _screenToModel(x, y) {
    var out = {x: 0, y: 0};
    this.screenToModel2(x, y, out);
    return out;
  };

  accept(visitor) {
    for (let layer of this.layers) {
      for (let object of layer.objects) {
        if (!object.accept(visitor)) {
          return false;
        }
      }
    }
  };

  findLayerByName(name) {
    for (var i = 0; i < this.layers.length; i++) {
      if (this.layers[i].name == name) {
        return this.layers[i];
      }
    }
    return null;
  };

  findById(id) {
    var result = null;
    this.accept(function (o) {
      if (o.id === id) {
        result = o;
        return false;
      }
      return true;
    });
    return result;
  };

  select(objs, exclusive) {
    if (exclusive) this.deselectAll();
    for (var i = 0; i < objs.length; i++) {
      this.mark(objs[i]);
    }
  };

  pick(e) {
    var m = this.screenToModel(e);
    return this.search(m.x, m.y, 20 / this.scale, true, false, []);
  };

  mark(obj, style) {
    if (style === undefined) {
      style = Styles.MARK;
    }
    obj.marked = style;

    if (this.selected.indexOf(obj) == -1) {
      this.selected.push(obj);
      this.streams.selection.next(this.selected);
    }
  };

  getActiveLayer() {
    var layer = this._activeLayer;
    if (layer == null || layer.readOnly) {
      layer = null;
      for (var i = 0; i < this.layers.length; i++) {
        var l = this.layers[i];
        if (!l.readOnly) {
          layer = l;
          break;
        }
      }
    }
    if (layer == null) {
      layer = this.createLayer("sketch", Styles.DEFAULT);
      this.layers.push(layer);
    }
    return layer;
  };

  setActiveLayerName(layerName) {
    let layer = this.findLayerByName(layerName);
    if (layer) {
      this.activeLayer = layer;
    } else {
      console.warn("layer doesn't exist: " + layerName);
    }
  };

  setActiveLayer(layer) {
    if (!layer.readOnly) {
      this._activeLayer = layer;
      this.bus.dispatch("activeLayer");
    }
  };

  deselect(obj) {
    for (var i = 0; i < this.selected.length; i++) {
      if (obj === this.selected[i]) {
        this.selected.splice(i, 1)[0].marked = null;
        break;
      }
    }
    this.streams.selection.next(this.selected);
  };

  deselectAll() {
    for (var i = 0; i < this.selected.length; i++) {
      this.selected[i].marked = null;
    }
    while (this.selected.length > 0) this.selected.pop();
    this.streams.selection.next(this.selected);
  };

  equalizeLinkedEndpoints() {
    const visited = new Set();

    function equalize(obj) {
      if (visited.has(obj.id)) return;
      visited.add(obj.id);
      for (let link of obj.linked) {
        if (isEndPoint(link)) {
          equalize(obj, link);
          link.setFromPoint(obj);
          equalize(link);
        }
      }
    }

    this.accept((obj) => {
      if (isEndPoint(obj)) {
        equalize(obj);
      }
      return true;
    });
  };

  fullHeavyUIRefresh() {
    this.refresh();
    this.parametricManager.notify();
  };

  createLayer(name, style, onUpdate) {
    return new Layer(name, style, this)
  };

  objectsUpdate = () => this.streams.objectsUpdate.next();
  
  get addingRoleMode() {
    return this.streams.addingRoleMode.value;
  }

  set addingRoleMode(value) {
    this.streams.addingRoleMode.next(value);
  }

  static __SKETCH_DRAW_PIPELINE = [
    (obj) => !isEndPoint(obj) && obj.marked === null && isConstruction(obj),
    (obj) => !isEndPoint(obj) && obj.marked === null && !isConstruction(obj),
    (obj) => !isEndPoint(obj) && obj.marked !== null,
    (obj) => isEndPoint(obj) && obj.marked === null,
    (obj) => isEndPoint(obj) && obj.marked !== null
  ];
  
  static __SIMPLE_DRAW_PIPELINE = [
    (obj) => true
  ];
}

const isEndPoint = o => o._class === 'TCAD.TWO.EndPoint';
const isConstruction = o => o.role === 'construction';

class Layer {

  constructor(name, style, viewer) {
    this.name = name;
    this.style = style;
    this.stylesByRoles = {
      'objectConstruction': Styles.CONSTRUCTION_OF_OBJECT,
      'construction': Styles.CONSTRUCTION,
      'virtual': Styles.VIRTUAL
    };
    this.objects = [];
    this.readOnly = false; // This is actually a mark for boundary layers coming from 3D
    this.viewer = viewer;
  }

  remove(object) {
    const idx = this.objects.indexOf(object);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      this.viewer.objectsUpdate();
      return true;
    }
    return false;
  };

  add(object) {
    if (object.layer !== undefined) {
      if (object.layer != null) {
        object.layer.remove(object);
      }
      if (object.layer !== this) {
        object.layer = this;
        this._addAndNotify(object);
      }
    } else {
      this._addAndNotify(object);
    }
  };
  
  _addAndNotify(object) {
    if (this.viewer.addingRoleMode) {
      object.role = this.viewer.addingRoleMode; 
    }
    this.objects.push(object);
    this.viewer.objectsUpdate();    
  }
}

export {Viewer, Styles}