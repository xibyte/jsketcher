import {Generator} from './id-generator'
import {Parameters, Bus} from '../ui/toolkit'
import {ParametricManager} from './parametric'
import {HistoryManager} from './history'
import {ToolManager} from './tools/manager'
import {PanTool} from './tools/pan'
import {DragTool} from './tools/drag'
import {Segment} from './shapes/segment'
import {EndPoint} from './shapes/point'
import {Point} from './shapes/primitives'
import {ReferencePoint} from './shapes/reference-point'
import {BasisOrigin} from './shapes/basis-origin'
import Vector from '../math/vector'

import * as draw_utils from './shapes/draw-utils'
import * as math from '../math/math'

var Styles = {
  DEFAULT : {
    lineWidth : 2,
    strokeStyle : "#ffffff", 
    fillStyle : "#000000"
  },
  
  SERVICE : {
    lineWidth : 0.3,
    strokeStyle : "#ff0000",
    fillStyle : "#FF0000"
  },

  MARK : {
    lineWidth : 2,
    strokeStyle : "#ff0000",
    fillStyle : "#FF0000"
  },

  SNAP : {
    lineWidth : 2,
    strokeStyle : "#00FF00",
    fillStyle : "#00FF00"
  },

  DIM : {
    lineWidth : 1,
    strokeStyle : "#bcffc1",
    fillStyle : "#00FF00"
  },

  BOUNDS : {
    lineWidth : 2,
    strokeStyle : "#fff5c3",
    fillStyle : "#000000"
  },
  
  CONSTRUCTION : {
    lineWidth : 1,
    strokeStyle : "#aaaaaa",
    fillStyle : "#000000"
  }
};


/** @constructor */
function Viewer(canvas, IO) {

  // 1/1000'' aka 1 mil is a standard precision for the imperial system(for engeneering) 
  // this precision also covers the metric system which is supposed to be ~0.01
  // this field is used only for displaying purposes now, although in future it could be
  // used to keep all internal data with such precision transforming the input from user
  this.presicion = 3; 
  this.canvas = canvas;
  this.params = new Parameters();
  this.io = new IO(this);
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

  this.onWindowResize = function() {
    updateCanvasSize();
    viewer.refresh();
  };
  updateCanvasSize();
  window.addEventListener( 'resize', this.onWindowResize, false );

  Object.defineProperty(this, "activeLayer", {
    get: viewer.getActiveLayer ,
    set: viewer.setActiveLayer
  });

  this.bus = new Bus();
  this.ctx = this.canvas.getContext("2d");
  this._activeLayer = null;
  this.layers = [];
  this._serviceLayers = [];
  this.dimLayer = new Layer("_dim", Styles.DIM);
  this.dimLayers = [this.dimLayer];
  this.bus.defineObservable(this, 'dimScale', 1);
  this.bus.subscribe('dimScale', function(){ viewer.refresh(); });
  
  this._workspace = [this.dimLayers, this.layers, this._serviceLayers];
  this.toolManager = new ToolManager(this, new PanTool(this));
  this.parametricManager = new ParametricManager(this);

  this.translate = {x : 0.0, y : 0.0};
  this.scale = 1.0;

  this.selected = [];
  this.snapped = null;
  
  this.referencePoint = new ReferencePoint();
  
  this._setupServiceLayer();

  this.historyManager = new HistoryManager(this);
  this.refresh();
}

Viewer.prototype.roundToPrecision = function(value) {
  return value.toFixed(this.presicion);
};

Viewer.prototype.addSegment = function(x1, y1, x2, y2, layer) {
  var a = new EndPoint(x1, y1);
  var b = new EndPoint(x2, y2);
  var line = new Segment(a, b);
  layer.objects.push(line);
  line.layer = layer;
  return line;
};

Viewer.prototype.remove = function(obj) {
  if (obj.layer != null) {
    var idx = obj.layer.objects.indexOf(obj);
    if (idx != -1) {
      this.parametricManager.removeConstraintsByObj(obj);
      obj.layer.objects.splice(idx, 1);
    }
  }
};

Viewer.prototype.add = function(obj, layer) {
  layer.objects.push(obj);
  obj.layer = layer;
};

Viewer.prototype.search = function(x, y, buffer, deep, onlyPoints, filter) {

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
      objs[j].accept(function(o) {
        if (!o.visible) return true;
        if (onlyPoints && o._class !== 'TCAD.TWO.EndPoint') {
          return false;  
        }
        l = o.normalDistance(aim);
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

Viewer.prototype._setupServiceLayer = function() {
  let layer = new Layer("_selection", Styles.DEFAULT);
  layer.objects = this.selected;
  this._serviceLayers.push(layer);

  layer = new Layer("_service", Styles.SERVICE);
//  layer.objects.push(new CrossHair(0, 0, 20));
  layer.objects.push(new Point(0, 0, 2));
  layer.objects.push(this.referencePoint);
  layer.objects.push(new BasisOrigin(null, this));
  this._serviceLayers.push(layer);

};

Viewer.prototype.refresh = function() {
  var viewer = this;
  window.requestAnimationFrame( function() {
    viewer.repaint();     
  });  
};

Viewer.prototype.repaint = function() {

  const ctx = this.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
  //Order is important!
  ctx.transform(1, 0, 0, -1, 0, this.canvas.height );
  ctx.transform(1, 0, 0, 1, this.translate.x , this.translate.y );
  ctx.transform(this.scale, 0, 0, this.scale, 0, 0);

  this.__prevStyle = null;

  for (let drawPredicate of Viewer.__DRAW_PIPELINE) {
    for (let layers of this._workspace) {
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

Viewer.__DRAW_PIPELINE = [
  (obj) => obj._class !== 'TCAD.TWO.EndPoint',
  (obj) => obj._class === 'TCAD.TWO.EndPoint' && obj.marked == null,
  (obj) => obj._class === 'TCAD.TWO.EndPoint' && obj.marked != null
];

Viewer.prototype.__draw = function(ctx, layer, obj) {
  let style = obj.style != null ? obj.style : layer.style;
  if (style !== this.__prevStyle) {
    draw_utils.SetStyle(style, ctx, this.scale / this.retinaPxielRatio);
  }
  this.__prevStyle = style;
  obj.draw(ctx, this.scale / this.retinaPxielRatio, this);
};

Viewer.prototype.snap = function(x, y, excl) {
  this.cleanSnap();
  var snapTo = this.search(x, y, 20 / this.scale, true, true, excl);
  if (snapTo.length > 0) {
    this.snapped = snapTo[0];
    this.mark(this.snapped, Styles.SNAP);
  }
  return this.snapped;
};

Viewer.prototype.cleanSnap = function() {
  if (this.snapped != null) {
    this.deselect(this.snapped);
    this.snapped = null;
  }
};

Viewer.prototype.showBounds = function(x1, y1, x2, y2, offset) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  if (this.canvas.width > this.canvas.height) {
    this.scale = this.canvas.height / dy;
  } else {
    this.scale = this.canvas.width / dx;
  }
  this.translate.x = -x1 * this.scale;
  this.translate.y = -y1 * this.scale;
};

Viewer.prototype.screenToModel2 = function(x, y, out) {

  out.x = x * this.retinaPxielRatio;
  out.y = this.canvas.height - y * this.retinaPxielRatio;

  out.x -= this.translate.x;
  out.y -= this.translate.y;

  out.x /= this.scale;
  out.y /= this.scale;
};

Viewer.prototype.screenToModel = function(e) {
  return this._screenToModel(e.offsetX, e.offsetY);
};

Viewer.prototype._screenToModel = function(x, y) {
  var out = {x: 0, y: 0};
  this.screenToModel2(x, y, out);
  return out;
};

Viewer.prototype.accept = function(visitor) {
  for (var i = 0; i < this.layers.length; i++) {
    var objs = this.layers[i].objects;
    var result = null;
    for (var j = 0; j < objs.length; j++) {
      if (!objs[j].accept(visitor)) {
        return false;
      }
    }
  }
};

Viewer.prototype.findLayerByName = function(name) {
  for (var i = 0; i < this.layers.length; i++) {
    if (this.layers[i].name == name) {
      return this.layers[i];
    }
  }
  return null;
};

Viewer.prototype.findById = function(id) {
  var result = null;
  this.accept(function(o) {
    if (o.id === id) {
      result = o;
      return false;
    }
    return true;
  });
  return result;
};

Viewer.prototype.select = function(objs, exclusive) {
  if (exclusive) this.deselectAll();
  for (var i = 0; i < objs.length; i++) {
    this.mark(objs[i]);
  }
};

Viewer.prototype.pick = function(e) {
  var m = this.screenToModel(e);
  return this.search(m.x, m.y, 20 / this.scale, true, false, []);
};

Viewer.prototype.mark = function(obj, style) {
  if (style === undefined) {
    style = Styles.MARK;
  }
  obj.marked = style;
  
  if (this.selected.indexOf(obj) == -1) {
    this.selected.push(obj);
  }
};

Viewer.prototype.getActiveLayer = function() {
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
    layer = new Layer("JustALayer", Styles.DEFAULT);
    this.layers.push(layer);
  }
  return layer;
};

Viewer.prototype.setActiveLayer = function(layer) {
  if (!layer.readOnly) {
    this._activeLayer = layer;
    this.bus.notify("activeLayer");
  }
};

Viewer.prototype.deselect = function(obj) {
  for (var i = 0; i < this.selected.length; i++) {
    if (obj === this.selected[i]) {
      this.selected.splice(i, 1)[0].marked = null;
      break;
    }
  }
};

Viewer.prototype.deselectAll = function() {
  for (var i = 0; i < this.selected.length; i++) {
    this.selected[i].marked = null;
  }
  while(this.selected.length > 0) this.selected.pop();
};

/** @constructor */
function Layer(name, style) {
  this.name = name;
  this.style = style;
  this.objects = [];
  this.readOnly = false; // This is actually a mark for boundary layers coming from 3D
}

Viewer.prototype.fullHeavyUIRefresh = function() {
  this.refresh();
  this.parametricManager.notify();
};

export {Viewer, Layer, Styles}