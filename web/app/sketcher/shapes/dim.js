/** @constructor */
TCAD.TWO.LinearDimension = function(a, b) {
  TCAD.TWO.SketchObject.call(this);
  this.a = a;
  this.b = b;
  this.flip = false;
};

TCAD.TWO.utils.extend(TCAD.TWO.LinearDimension, TCAD.TWO.SketchObject);

TCAD.TWO.LinearDimension.prototype.collectParams = function(params) {
};

TCAD.TWO.LinearDimension.prototype.getReferencePoint = function() {
  return this.a;
};

TCAD.TWO.LinearDimension.prototype.translateImpl = function(dx, dy) {
};

TCAD.TWO.LinearDimension.prototype.getA = function() { return this.a };
TCAD.TWO.LinearDimension.prototype.getB = function() { return this.b };

TCAD.TWO.LinearDimension.getTextOff = function(scale) {
  return 3 * scale;
};

TCAD.TWO.LinearDimension.prototype.drawImpl = function(ctx, scale, viewer) {

  var off = 30 * viewer.dimScale;
  var textOff = TCAD.TWO.LinearDimension.getTextOff(viewer.dimScale);

  var a, b, startA, startB;
  if (this.flip) {
    a = this.getB();
    b = this.getA();
    startA = this.b;
    startB = this.a;
  } else {
    a = this.getA();
    b = this.getB();
    startA = this.a;
    startB = this.b;
  }
  
  var d = TCAD.math.distanceAB(a, b);

  var _vx = - (b.y - a.y);
  var _vy = b.x - a.x;

  //normalize
  var _vxn = _vx / d;
  var _vyn = _vy / d;

  _vx = _vxn * off;
  _vy = _vyn * off;

  ctx.beginPath();

  var _ax = a.x + _vx;
  var _ay = a.y + _vy;
  var _bx = b.x + _vx;
  var _by = b.y + _vy;

  ctx.moveTo(_ax, _ay);
  ctx.lineTo(_bx, _by);


  function drawRef(start, x, y) {
    var vec = new TCAD.Vector(x - start.x, y - start.y);
    vec._normalize();
    vec._multiply(7 * viewer.dimScale);
    
    ctx.moveTo(start.x, start.y );
    ctx.lineTo(x, y);
    ctx.lineTo(x + vec.x, y + vec.y);
  }

  drawRef(startA, _ax, _ay);
  drawRef(startB, _bx, _by);

  ctx.closePath();
  ctx.stroke();

  function drawArrow(x, y) {
    var s1 = 50;
    var s2 = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s1, y - s2);
    ctx.closePath();
    ctx.stroke();
  }

//  drawArrow(_ax, _ay);
//  drawArrow(_bx, _by);

  ctx.font= (12 * viewer.dimScale) + "px Arial";
  var txt = d.toFixed(2);
  var h = d / 2 - ctx.measureText(txt).width / 2;

  if (h > 0) {
    var tx = (_ax + _vxn * textOff) - (- _vyn) * h;
    var ty = (_ay + _vyn * textOff) - (  _vxn) * h;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(	- Math.atan2(_vxn, _vyn));
    ctx.scale(1, -1);
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
};

TCAD.TWO.LinearDimension.prototype.normalDistance = function(aim) {
  return -1;
};

/** @constructor */
TCAD.TWO.Dimension = function(a, b) {
  TCAD.TWO.LinearDimension.call(this, a, b);
};

TCAD.TWO.utils.extend(TCAD.TWO.Dimension, TCAD.TWO.LinearDimension);

TCAD.TWO.Dimension.prototype._class = 'TCAD.TWO.Dimension';

/** @constructor */
TCAD.TWO.HDimension = function(a, b) {
  TCAD.TWO.LinearDimension.call(this, a, b);
};

TCAD.TWO.utils.extend(TCAD.TWO.HDimension, TCAD.TWO.LinearDimension);

TCAD.TWO.HDimension.prototype._class = 'TCAD.TWO.HDimension';

TCAD.TWO.HDimension.prototype.getA = function() { return this.a };
TCAD.TWO.HDimension.prototype.getB = function() { return {x : this.b.x, y : this.a.y} };

/** @constructor */
TCAD.TWO.VDimension = function(a, b) {
  TCAD.TWO.LinearDimension.call(this, a, b);
};

TCAD.TWO.utils.extend(TCAD.TWO.VDimension, TCAD.TWO.LinearDimension);

TCAD.TWO.VDimension.prototype._class = 'TCAD.TWO.VDimension';

TCAD.TWO.VDimension.prototype.getA = function() { return this.a };
TCAD.TWO.VDimension.prototype.getB = function() { return {x : this.a.x, y : this.b.y} };


/** @constructor */
TCAD.TWO.DiameterDimension = function(obj) {
  TCAD.TWO.SketchObject.call(this);
  this.obj = obj;
  this.angle = Math.PI / 4;
};

TCAD.TWO.DiameterDimension.prototype._class = 'TCAD.TWO.DiameterDimension';

TCAD.TWO.utils.extend(TCAD.TWO.DiameterDimension, TCAD.TWO.SketchObject);

TCAD.TWO.DiameterDimension.prototype.collectParams = function(params) {
};

TCAD.TWO.DiameterDimension.prototype.getReferencePoint = function() {
  
};

TCAD.TWO.DiameterDimension.prototype.translateImpl = function(dx, dy) {
};

TCAD.TWO.DiameterDimension.prototype.drawImpl = function(ctx, scale, viewer) {
  if (this.obj == null) return;
  var c = new TCAD.Vector().setV(this.obj.c);
  var r = this.obj.r.value;
  var angled = new TCAD.Vector(r * Math.cos(this.angle), r * Math.sin(this.angle), 0);
  var a = c.minus(angled);
  var b = c.plus(angled);
  var textOff = TCAD.TWO.LinearDimension.getTextOff(viewer.dimScale);

  var d = TCAD.math.distanceAB(a, b);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.stroke();

  var fontSize = 12 * viewer.dimScale;
  ctx.font = (fontSize) + "px Arial";
  var txt = String.fromCharCode(216) + ' ' + d.toFixed(2);
  var textWidth = ctx.measureText(txt).width;
  var h = d / 2 - textWidth / 2; 
  
  var _vx = - (b.y - a.y);
  var _vy = b.x - a.x;

  //normalize
  var _vxn = _vx / d;
  var _vyn = _vy / d;

  function drawText(tx, ty) {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-Math.atan2(_vxn, _vyn));
    ctx.scale(1, -1);
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  if (h - fontSize * .3 > 0) { // take into account font size to not have circle overlap symbols
    var tx = (a.x + _vxn * textOff) - (-_vyn) * h;
    var ty = (a.y + _vyn * textOff) - (  _vxn) * h;
    drawText(tx, ty);
  } else {
    var off = 2 * viewer.dimScale;
    angled._normalize();
    var extraLine = angled.multiply(textWidth + off * 2);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + extraLine.x, b.y + extraLine.y);
    ctx.closePath();
    ctx.stroke();
    angled._multiply(off);
    
    var tx = (b.x + _vxn * textOff) + angled.x;
    var ty = (b.y + _vyn * textOff) + angled.y;
    drawText(tx, ty);
  }
};

TCAD.TWO.DiameterDimension.prototype.normalDistance = function(aim) {
  return -1;
};


/** @constructor */
TCAD.TWO.AddDimTool = function(viewer, layer, dimCreation) {
  this.viewer = viewer;
  this.layer = layer;
  this.dim = null;
  this._v = new TCAD.Vector(0, 0, 0);
  this.dimCreation = dimCreation;
};

TCAD.TWO.AddDimTool.prototype.keydown = function(e) {};
TCAD.TWO.AddDimTool.prototype.keypress = function(e) {};
TCAD.TWO.AddDimTool.prototype.keyup = function(e) {};
TCAD.TWO.AddDimTool.prototype.cleanup = function(e) {};

TCAD.TWO.AddDimTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  this.viewer.snap(p.x, p.y, []);
  if (this.dim != null) {
    this.dim.b.x = p.x;
    this.dim.b.y = p.y;
  }
  this.viewer.refresh();
};

TCAD.TWO.AddDimTool.prototype.mouseup = function(e) {

  if (e.button > 0 && this.dim != null) {
    this.dim.flip = !this.dim.flip;
    this.viewer.refresh();
    return;
  }

  if (this.viewer.snapped.length == 0) {
    return;
  }

  var p = this.viewer.snapped.pop();
  this.viewer.cleanSnap();

  if (this.dim == null) {
    this.viewer.historyManager.checkpoint();
    this.dim = this.dimCreation(p, new TCAD.TWO.EndPoint(p.x, p.y));
    this.layer.objects.push(this.dim);
    this.viewer.refresh();
  } else {
    this.dim.b = p;
    this.viewer.toolManager.releaseControl();
    this.viewer.refresh();
  }
};

TCAD.TWO.AddDimTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddDimTool.prototype.mousewheel = function(e) {
};

/** @constructor */
TCAD.TWO.AddCircleDimTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
  this.dim = new TCAD.TWO.DiameterDimension(null);
  this.viewer.add(this.dim, this.layer);
};

TCAD.TWO.AddCircleDimTool.prototype.keydown = function(e) {};
TCAD.TWO.AddCircleDimTool.prototype.keypress = function(e) {};
TCAD.TWO.AddCircleDimTool.prototype.keyup = function(e) {};
TCAD.TWO.AddCircleDimTool.prototype.cleanup = function(e) {};

TCAD.TWO.AddCircleDimTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  var objects = this.viewer.search(p.x, p.y, 20 / this.viewer.scale, true, false, []);
  var circles = objects.filter(function(o) {return o._class === 'TCAD.TWO.Circle'});
  
  if (circles.length != 0) {
    this.dim.obj = circles[0];
  } else {
    this.dim.obj = null; 
  }
  if (this.dim.obj != null) {
    this.dim.angle = Math.atan2(p.y - this.dim.obj.c.y, p.x - this.dim.obj.c.x);
  }
  this.viewer.refresh();
};

TCAD.TWO.AddCircleDimTool.prototype.mouseup = function(e) {
  if (this.dim.obj !== null) {
    this.viewer.historyManager.checkpoint();
  } else {
    this.viewer.remove(this.dim);
  }
  this.viewer.toolManager.releaseControl();
};

TCAD.TWO.AddCircleDimTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddCircleDimTool.prototype.mousewheel = function(e) {
};

