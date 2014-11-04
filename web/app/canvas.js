TCAD = {
  TWO : {}
};

TCAD.TWO.Styles = {
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
  }

};

TCAD.TWO.utils = {};

TCAD.TWO.utils.extend = function(func, parent) {
  for(var prop in parent.prototype) {
    if(parent.prototype.hasOwnProperty(prop))
      func.prototype[prop] = parent.prototype[prop];
  }
};

TCAD.TWO.utils.point = function(x, y){ return {x: x, y: y} };

TCAD.TWO.utils.drawPoint = function (ctx, x, y, rad, scale) {
  ctx.beginPath();
  ctx.arc(x, y, rad / scale, 0, 2 * Math.PI, false);
  ctx.fill();
};

TCAD.TWO.utils.setStyle = function(style, ctx, scale) {
  ctx.lineWidth  = style.lineWidth / scale;
  ctx.strokeStyle  = style.strokeStyle;
  ctx.fillStyle  = style.fillStyle;
};

TCAD.TWO.Viewer = function(canvas) {
  
  this.canvas = canvas;

  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;

  this.ctx = this.canvas.getContext("2d");
  this.layers = [];
  this._serviceLayers = [];
  this._workspace = [this.layers, this._serviceLayers];
  this.toolManager = new TCAD.TWO.ToolManager(this, new TCAD.TWO.PanTool(this));
  this.parametricManager = new TCAD.TWO.ParametricManager(this);

  this.translate = {x : 0.0, y : 0.0};
  this.scale = 1.0;

  this.selected = [];
  this.snapped = [];
  
  this._setupServiceLayer();
  this.refresh();
};

TCAD.TWO.Viewer.prototype.validateGeom = function() {
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

TCAD.TWO.Viewer.prototype.addSegment = function(x1, y1, x2, y2, layer) {
  var a = new TCAD.TWO.EndPoint(x1, y1);
  var b = new TCAD.TWO.EndPoint(x2, y2);
  var line = new TCAD.TWO.Segment(a, b);
  layer.objects.push(line);
  line.layer = layer;
  return line;
};

TCAD.TWO.Viewer.prototype.remove = function(obj) {
  if (obj.layer != null) {
    var idx = obj.layer.objects.indexOf(obj);
    if (idx != -1) {
      this.parametricManager.removeConstraintsByObj(obj);
      obj.layer.objects.splice(idx, 1);
    }
  }
};

TCAD.TWO.Viewer.prototype.search = function(x, y, buffer, deep, onlyPoints) {

  buffer *= 0.5;
  
  var pickResult = [];
  var aim = new TCAD.Vector(x, y);

  var heroIdx = 0;
  var unreachable = buffer * 2;
  var heroLength = unreachable; // unreachable

  for (var i = 0; i < this.layers.length; i++) {
    var objs = this.layers[i].objects;
    for (var j = 0; j < objs.length; j++) {
      var l = unreachable + 1;
      var hit = !objs[j].acceptV(true, function(o) {
        if (onlyPoints && o._class !== 'TCAD.TWO.EndPoint') {
          return false;  
        }
        l = o.normalDistance(aim);
        if (l >= 0 && l <= buffer) {
          pickResult.push(o);
          return false;
        }
        return true;
      });
      
      if (hit) {
        if (!deep && pickResult.length != 0) return pickResult;
        if (l < heroLength) {
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

TCAD.TWO.Viewer.prototype._setupServiceLayer = function() {
  var layer = new TCAD.TWO.Layer("_service", TCAD.TWO.Styles.SERVICE);
  layer.objects.push(new TCAD.TWO.Point(0, 0, 2));
  this._serviceLayers.push(layer);

  layer = new TCAD.TWO.Layer("_selection", TCAD.TWO.Styles.DEFAULT);
  layer.objects = this.selected;
  this._serviceLayers.push(layer);
  
};

TCAD.TWO.Viewer.prototype.refresh = function() {
  var viewer = this;
  window.requestAnimationFrame( function() {
    viewer.repaint();     
  });  
};

TCAD.TWO.Viewer.prototype.repaint = function() {
  
  var ctx = this.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
  //Order is important!
  ctx.transform(1, 0, 0, -1, 0, this.canvas.height );
  ctx.transform(1, 0, 0, 1, this.translate.x , this.translate.y );
  ctx.transform(this.scale, 0, 0, this.scale, 0, 0);

  var prevStyle = null;
  var style;
  for (var w = 0; w < this._workspace.length; w++) {
    var layers = this._workspace[w];
    for (var l = 0; l < layers.length; l++) {
      var layer = layers[l];
      for (var o = 0; o < layer.objects.length; o++) {
        var obj = layer.objects[o];
        style = obj.style != null ? obj.style : layer.style;
        if (style != prevStyle) TCAD.TWO.utils.setStyle(style, ctx, this.scale);
        obj.draw(ctx, this.scale);
      }
    }
  }
};

TCAD.TWO.Viewer.prototype.snap = function(x, y, excl) {
  this.cleanSnap();
  var snapTo = this.search(x, y, 20 / this.scale, false, true);
  if (snapTo.length > 0) {
    snapTo = snapTo[0];
    for (var i = 0; i < excl.length; i++) {
      if (excl[i] === snapTo) {
        return;
      }
    }
    this.mark(snapTo, TCAD.TWO.Styles.SNAP);
    this.snapped.push(snapTo);
    return snapTo;
  }
  return null;
};

TCAD.TWO.Viewer.prototype.cleanSnap = function() {
  while(this.snapped.length > 0) {
    this.snapped.pop().marked = null;
  }
};

TCAD.TWO.Viewer.prototype.showBounds = function(x1, y1, x2, y2) {
  this.translate.x = -x1;
  this.translate.y = -y1;
  var dx = x2 - x1;
  var dy = y2 - y1;
  console.log(this.scale);
  this.scale = this.canvas.width / dx;
  this.scale *= 0.7;
};

TCAD.TWO.Viewer.prototype.screenToModel2 = function(x, y, out) {

  out.x = x;
  out.y = this.canvas.height - y;

  out.x -= this.translate.x;
  out.y -= this.translate.y;

  out.x /= this.scale;
  out.y /= this.scale;
};

TCAD.TWO.Viewer.prototype.screenToModel = function(point) {
  var out = {x: 0, y: 0};
  this.screenToModel2(point.x, point.y, out);
  return out;
};

TCAD.TWO.Viewer.prototype.select = function(objs, exclusive) {
  if (exclusive) this.deselectAll();
  for (var i = 0; i < objs.length; i++) {
    this.mark(objs[i]);
  }
};

TCAD.TWO.Viewer.prototype.pick = function(e) {
  var m = this.screenToModel(e);
  return this.search(m.x, m.y, 20 / this.scale, true, false);
};

TCAD.TWO.Viewer.prototype.mark = function(obj, style) {
  if (style === undefined) {
    style = TCAD.TWO.Styles.MARK;
  }
  obj.marked = style;
  this.selected.push(obj);
};

TCAD.TWO.Viewer.prototype.deselectAll = function() {
  for (var i = 0; i < this.selected.length; i++) {
    this.selected[i].marked = null;
  }
  while(this.selected.length > 0) this.selected.pop();
};

TCAD.TWO.Layer = function(name, style) {
  this.name = name;
  this.style = style;
  this.objects = [];
};

TCAD.TWO.Polygon = function(points) {
  this.points = points;
  this.style = null;
};

TCAD.TWO.Polygon.prototype.draw = function(ctx) {

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

TCAD.TWO.Polyline = function(points) {
  this.points = points;
  this.style = null;
};

TCAD.TWO.Polyline.prototype.draw = function(ctx) {

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

TCAD.TWO.utils.ID_COUNTER = 0;

TCAD.TWO.utils.genID = function() {
  return TCAD.TWO.utils.ID_COUNTER ++;
};

TCAD.TWO.SketchObject = function() {
  this.id = TCAD.TWO.utils.genID();
  this.aux = false;
  this.marked = null;
  this.visible = true;
  this.children = [];
  this.linked = [];
  this.layer = null;
};

TCAD.TWO.SketchObject.prototype.accept = function(visitor) {
  return this.acceptV(false, visitor);
};

TCAD.TWO.SketchObject.prototype.acceptV = function(onlyVisible, visitor) {
  if (!this.visible) return false;
  for (var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    if (!child.acceptV(onlyVisible, visitor)) {
      return false;
    }
  }
  return visitor(this);
};

TCAD.TWO.SketchObject.prototype.validate = function() {
  return true;
};


TCAD.TWO.SketchObject.prototype.getDefaultTool = function(viewer) {
  return new TCAD.TWO.DragTool(this, viewer);
};

TCAD.TWO.SketchObject.prototype.isAuxOrLinkedTo = function() {
  if (!!this.aux) {
    return true;
  }
  for (var i = 0; i < this.linked.length; ++i) {
    if (!!this.linked[i].aux) {
      return true;
    }
  }
  return false;
};

TCAD.TWO.SketchObject.prototype._translate = function(dx, dy, translated) {
  translated[this.id] = 'x';
  for (var i = 0; i < this.linked.length; ++i) {
    if (translated[this.linked[i].id] != 'x') {
      this.linked[i]._translate(dx, dy, translated);
    }
  }
  this.translateImpl(dx, dy);
};

TCAD.TWO.SketchObject.prototype.translate = function(dx, dy) {
//  this.translateImpl(dx, dy);
  if (this.isAuxOrLinkedTo()) {
    return;
  }
  this._translate(dx, dy, {});
};

TCAD.TWO.SketchObject.prototype.draw = function(ctx, scale) {
  if (!this.visible) return;
  if (this.marked != null) {
    ctx.save();
    TCAD.TWO.utils.setStyle(this.marked, ctx, scale);
  }
  this.drawImpl(ctx, scale);
  if (this.marked != null) ctx.restore();
  for (var i = 0; i < this.children.length; i++) {
    this.children[i].draw(ctx, scale);
  }
};

TCAD.TWO.Ref = function(value) {
  this.id = TCAD.TWO.utils.genID();
  this.value = value;
};

TCAD.TWO.Ref.prototype.set = function(value) {
  this.value = value;
};

TCAD.TWO.Ref.prototype.get = function() {
  return this.value;
};

TCAD.TWO.Param = function(obj, prop) {
  this.id = TCAD.TWO.utils.genID();
  this.obj = obj;
  this.prop = prop;
};

TCAD.TWO.Param.prototype.set = function(value) {
  this.obj[this.prop] = value;
};

TCAD.TWO.Param.prototype.get = function() {
  return this.obj[this.prop];
};

TCAD.TWO.EndPoint = function(x, y) {
  TCAD.TWO.SketchObject.call(this);
  this.x = x;
  this.y = y;
  this.parent = null;
  this._x =  new TCAD.TWO.Param(this, 'x');
  this._y =  new TCAD.TWO.Param(this, 'y');
};

TCAD.TWO.utils.extend(TCAD.TWO.EndPoint, TCAD.TWO.SketchObject);

TCAD.TWO.EndPoint.prototype._class = 'TCAD.TWO.EndPoint';

TCAD.TWO.EndPoint.prototype.collectParams = function(params) {
  params.push(this._x);
  params.push(this._y);
};

TCAD.TWO.EndPoint.prototype.normalDistance = function(aim) {
  return aim.minus(new TCAD.Vector(this.x, this.y)).length();
};

TCAD.TWO.EndPoint.prototype.getReferencePoint = function() {
  return this;
};

TCAD.TWO.EndPoint.prototype.translateImpl = function(dx, dy) {
  this.x += dx;
  this.y += dy;
};

TCAD.TWO.EndPoint.prototype.drawImpl = function(ctx, scale) {
  TCAD.TWO.utils.drawPoint(ctx, this.x, this.y, 3, scale)
};

TCAD.TWO.Segment = function(a, b) {
  TCAD.TWO.SketchObject.call(this);
  this.a = a;
  this.b = b;
  a.parent = this;
  b.parent = this;
  this.children.push(a, b);
};

TCAD.TWO.utils.extend(TCAD.TWO.Segment, TCAD.TWO.SketchObject);

TCAD.TWO.Segment.prototype._class = 'TCAD.TWO.Segment';

TCAD.TWO.Segment.prototype.validate = function() {
  return TCAD.math.distanceAB(this.a, this.b) > TCAD.TOLERANCE;
};

TCAD.TWO.Segment.prototype.collectParams = function(params) {
  this.a.collectParams(params);
  this.b.collectParams(params);
};

TCAD.TWO.Segment.prototype.normalDistance = function(aim) {
  var x = aim.x;
  var y = aim.y;

  var ab = new TCAD.Vector(this.b.x - this.a.x, this.b.y - this.a.y)
  var e = ab.normalize();
  var a = new TCAD.Vector(aim.x - this.a.x, aim.y - this.a.y);
  var b = e.multiply(a.dot(e));
  var n = a.minus(b);

  //Check if vector b lays on the vector ab
  if (b.length() > ab.length()) {
    return -1;
  }

  if (b.dot(ab) < 0) {
    return -1;
  }

  return n.length();
};

TCAD.TWO.Segment.prototype.getReferencePoint = function() {
  return this.a;
};

TCAD.TWO.Segment.prototype.translateImpl = function(dx, dy) {
  this.a.translate(dx, dy);
  this.b.translate(dx, dy);
};

TCAD.TWO.Segment.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  ctx.moveTo(this.a.x, this.a.y);
  ctx.lineTo(this.b.x, this.b.y);
  ctx.stroke();
};

TCAD.TWO.Point = function(x, y, rad) {
  this.x = x;
  this.y = y;
  this.rad = rad;
  this.style = null;
};

TCAD.TWO.Point.prototype.draw = function(ctx, scale) {
  TCAD.TWO.utils.drawPoint(ctx, this.x, this.y, this.rad, scale);
};

TCAD.TWO.ToolManager = function(viewer, defaultTool) {
  this.stack = [defaultTool];
  var canvas = viewer.canvas;
  var tm = this;
  canvas.addEventListener('mousemove', function (e) {
    e.preventDefault();
    e.stopPropagation();
    tm.getTool().mousemove(e);
  }, false);
  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    tm.getTool().mousedown(e);
  }, false);
  canvas.addEventListener('mouseup', function (e) {
    e.preventDefault();
    e.stopPropagation();
    tm.getTool().mouseup(e);
  }, false);
  canvas.addEventListener('mousewheel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    tm.getTool().mousewheel(e);
  }, false);

  window.addEventListener("keydown", function (e) {
    tm.getTool().keydown(e);
  }, false);
  window.addEventListener("keypress", function (e) {
    tm.getTool().keydown(e);
  }, false);
  window.addEventListener("keyup", function (e) {
    tm.getTool().keydown(e);
  }, false);
};

TCAD.TWO.ToolManager.prototype.takeControl = function(tool) {
  this.stack.push(tool);
};

TCAD.TWO.ToolManager.prototype.releaseControl = function() {
  if (this.stack.length == 1) {
    return;
  }
  this.stack.pop().cleanup();
};

TCAD.TWO.ToolManager.prototype.getTool = function() {
  return this.stack[this.stack.length - 1];
};

TCAD.TWO.PanTool = function(viewer) {
  this.viewer = viewer;
  this.dragging = false;
  this.x = 0.0;
  this.y = 0.0;
};

TCAD.TWO.PanTool.prototype.keydown = function(e) {};
TCAD.TWO.PanTool.prototype.keypress = function(e) {};
TCAD.TWO.PanTool.prototype.keyup = function(e) {};
TCAD.TWO.PanTool.prototype.cleanup = function(e) {};

TCAD.TWO.PanTool.prototype.mousemove = function(e) {
  if (!this.dragging) {
    return;    
  }
  var dx = e.pageX - this.x;
  var dy = e.pageY - this.y;
  dy *= -1;
  
  this.viewer.translate.x += dx;  
  this.viewer.translate.y += dy;
  
  this.x = e.pageX;
  this.y = e.pageY;
  this.deselectOnUp = false;
  this.viewer.refresh();
};

TCAD.TWO.PanTool.prototype.mousedown = function(e) {
  if (e.button == 0) {
    var picked = this.viewer.pick(e);
    if (picked.length > 0) {
      if (e.ctrlKey) {
        this.viewer.select([picked[0]], false);
        this.deselectOnUp = false;
      } else {
        this.viewer.select([picked[0]], true);
        if (!picked[0].isAuxOrLinkedTo()) {
          var tool = picked[0].getDefaultTool(this.viewer);
          tool.mousedown(e);
          this.viewer.toolManager.takeControl(tool);
        }
      }
      this.viewer.refresh();
      return;
    }
  }

  this.dragging = true;
  this.deselectOnUp = true;
  this.x = e.pageX;
  this.y = e.pageY;
};

TCAD.TWO.PanTool.prototype.mouseup = function(e) {
  this.dragging = false;
  if (this.deselectOnUp) {
    this.viewer.deselectAll();
    this.viewer.refresh();
  }
  this.deselectOnUp = false;
};

TCAD.TWO.PanTool.prototype.mousewheel = function(e) {

  var delta = 0;

  if ( e.wheelDelta ) { // WebKit / Opera / Explorer 9
    delta = e.wheelDelta / 40;
  } else if ( e.detail ) { // Firefox
    delta = - e.detail / 3;
  }

  var before = this.viewer.screenToModel(e);
  
  this.viewer.scale += delta * 0.01;
  
  var after = this.viewer.screenToModel(e);
  
  var dx = after.x - before.x;
  var dy = after.y - before.y;

  this.viewer.translate.x += dx * this.viewer.scale;
  this.viewer.translate.y += dy * this.viewer.scale;

  this.viewer.refresh();
};

TCAD.TWO.DragTool = function(obj, viewer) {
  this.obj = obj;
  this.viewer = viewer;
  this._point = {x: 0, y: 0};
  this.ref = this.obj.getReferencePoint();
  this.errorX = 0;
  this.errorY = 0;
  this.solver = null;
};

TCAD.TWO.DragTool.prototype.keydown = function(e) {};
TCAD.TWO.DragTool.prototype.keypress = function(e) {};
TCAD.TWO.DragTool.prototype.keyup = function(e) {};
TCAD.TWO.DragTool.prototype.cleanup = function(e) {};

TCAD.TWO.DragTool.prototype.mousemove = function(e) {
  var x = this._point.x;
  var y = this._point.y;
  this.viewer.screenToModel2(e.x, e.y, this._point);
  var dx = this._point.x - x - this.errorX;
  var dy = this._point.y - y - this.errorY;
  var checkX = this.ref.x;
  var checkY = this.ref.y;
  this.obj.translate(dx, dy);
  if (!e.shiftKey) {
    this.solveRequest(2);
  }

  this.errorX = (this.ref.x - dx) - checkX;
  this.errorY = (this.ref.y - dy) - checkY;

//  console.log("accumulated error X = " + this.errorX);
//  console.log("accumulated error Y = " + this.errorY);

  this.viewer.refresh();
};

TCAD.TWO.DragTool.prototype.mousedown = function(e) {
  this.viewer.screenToModel2(e.x, e.y, this._point);
  this.prepareSolver();
};

TCAD.TWO.DragTool.prototype.mouseup = function(e) {
  this.solveRequest(0);
  this.viewer.refresh();
  this.viewer.toolManager.releaseControl();
};

TCAD.TWO.DragTool.prototype.mousewheel = function(e) {
};

TCAD.TWO.DragTool.prototype.solveRequest = function(fineLevel) {

  var locked;
  if (this.obj._class === 'TCAD.TWO.EndPoint') {
    locked = [this.obj._x, this.obj._y];
    if (this.obj.parent != null
      && this.obj.parent._class === 'TCAD.TWO.Arc') {

      if (this.obj.id != this.obj.parent.c.id) {
        locked.push(this.obj.parent.c._x);
        locked.push(this.obj.parent.c._y);
      }
    }
  } else {
    locked = [];
  }
  this.solver = this.viewer.parametricManager.prepare(locked);
  this.solver.solve(fineLevel);
  this.solver.sync();
};

TCAD.TWO.DragTool.prototype.prepareSolver = function() {

};
