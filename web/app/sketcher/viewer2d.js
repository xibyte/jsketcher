import {Generator} from './id-generator'
import {Parameters, Bus} from '../ui/toolkit'
import {ParametricManager} from './parametric'
import {HistoryManager} from './history'
import {ToolManager} from './tools/manager'
import {PanTool} from './tools/pan'
import {DragTool} from './tools/drag'
import {Segment} from './shapes/segment'
import {EndPoint} from './shapes/point'
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

Viewer.prototype.validateGeom = function() {
  for (var i = 0; i < this.layers.length; i++) {
    var objs = this.layers[i].objects;
    for (var j = 0; j < objs.length; j++) {
      if (!objs[j].validate()) {
        return false;        
      }
    }
  }
  return true;
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
      objs[j].acceptV(true, function(o) {
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

  let prevStyle = null;
  const draw = (layer, obj) => {
    let style = obj.style != null ? obj.style : layer.style;
    if (style != prevStyle) draw_utils.SetStyle(style, ctx, this.scale / this.retinaPxielRatio);
    obj.draw(ctx, this.scale / this.retinaPxielRatio, this);
  };
  let points = [];
  for (let w = 0; w < this._workspace.length; w++) {
    let layers = this._workspace[w];
    for (let l = 0; l < layers.length; l++) {
      points.length = 0;
      let layer = layers[l];
      for (let o = 0; o < layer.objects.length; o++) {
        let obj = layer.objects[o];
        draw(layer, obj);
        Viewer.collectPoints(obj, points);
      }
      //Repaint points one more time
      for (let point of points) {
        draw(layer, point);
      }
    }
  }
};

Viewer.collectPoints = function(object, points) {
  if (object.acceptV){
    object.acceptV(true, (obj) => {
      if (obj._class === 'TCAD.TWO.EndPoint') {
        points.push(obj);
      }
      return true;
    });
  }
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

/** @constructor */
function Polygon(points) {
  this.points = points;
  this.style = null;
}

Polygon.prototype.draw = function(ctx) {

  if (this.points.length < 3) {
    return;    
  }
  
  ctx.beginPath();
  var first = this.points[0];
  ctx.moveTo(first.x, first.y);
  for (var i = 1; i < this.points.length; i++) {
    var p = this.points[i];
    ctx.lineTo(p.x, p.y);    
  }
  ctx.closePath();
  ctx.stroke(); 
};

/** @constructor */
function Polyline(points) {
  this.points = points;
  this.style = null;
}

Polyline.prototype.draw = function(ctx) {

  if (this.points.length < 2) {
    return;
  }

  var first = this.points[0];
  ctx.moveTo(first.x, first.y);
  for (var i = 1; i < this.points.length; i++) {
    var p = this.points[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
};

/** @constructor */
function Point(x, y, rad) {
  this.x = x;
  this.y = y;
  this.rad = rad;
  this.style = null;
}

Point.prototype.draw = function(ctx, scale) {
  draw_utils.DrawPoint(ctx, this.x, this.y, this.rad, scale);
};

/** @constructor */
function CrossHair(x, y, rad) {
  this.x = x;
  this.y = y;
  this.rad = rad;
  this.style = null;
}

CrossHair.prototype.draw = function(ctx, scale) {
  ctx.beginPath();
  var rad = this.rad / scale;
  ctx.moveTo(this.x - rad, this.y);
  ctx.lineTo(this.x + rad, this.y);
  ctx.closePath();
  ctx.moveTo(this.x, this.y - rad);
  ctx.lineTo(this.x, this.y + rad);
  ctx.closePath();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.stroke();
  ctx.restore();
};

/** @constructor */
function BasisOrigin(basis, viewer) {
  this.viewer = viewer;
  this.inverseX = false;
  this.inverseY = false;
  this.lineWidth = 100;
  this.xColor = '#FF0000';
  this.yColor = '#00FF00';
}

BasisOrigin.prototype.draw = function(ctx, scale) {
  ctx.save();
  if (this.inverseX) {
    this.xScale = -1;
    this.xShift = this.lineWidth + 10;
  } else {
    this.xScale = 1;
    this.xShift = 10;
  }
  if (this.inverseY) {
    this.yScale = -1;
    this.yShift = this.viewer.canvas.height - this.lineWidth - 10;
  } else {
    this.yScale = 1;
    this.yShift = this.viewer.canvas.height - 10;
  }

  ctx.setTransform( this.xScale, 0, 0, this.yScale, this.xShift, this.yShift);
  ctx.beginPath();
  
  ctx.lineWidth  = 1;
  ctx.strokeStyle  = this.yColor;

  var headA = 1;
  var headB = 10;

  ctx.moveTo(0.5, 0);
  ctx.lineTo(0.5, - this.lineWidth);
  
  ctx.moveTo(0, - this.lineWidth);
  ctx.lineTo(headA, 0 - this.lineWidth + headB);

  ctx.moveTo(0, - this.lineWidth);
  ctx.lineTo(- headA, - this.lineWidth + headB);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle  = this.xColor;
  ctx.moveTo(0, 0.5);
  ctx.lineTo(this.lineWidth, 0.5);

  ctx.moveTo(this.lineWidth, 0);
  ctx.lineTo(this.lineWidth - headB, headA);

  ctx.moveTo(this.lineWidth, 0);
  ctx.lineTo(this.lineWidth - headB, - headA);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
};


/** @constructor */
function ReferencePoint(viewer) {
  this.viewer = viewer;
  this.visible = true;
  this.x = 0;
  this.y = 0;
}

ReferencePoint.prototype.draw = function(ctx, scale) {
  if (!this.visible) return;
  ctx.strokeStyle  = 'salmon';
  ctx.fillStyle  = 'salmon';
  ctx.lineWidth = 1 / scale;
  
  ctx.beginPath();
  ctx.arc(this.x, this.y, 1 / scale, 0, 2 * Math.PI, false);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(this.x, this.y, 7 / scale, 0, 2 * Math.PI, false);
  ctx.stroke();
};

export {Viewer, Layer, Styles}