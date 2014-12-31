
TCAD.TWO.Dimension = function(a, b) {
  TCAD.TWO.SketchObject.call(this);
  this.a = a;
  this.b = b;
  this.flip = false;
};

TCAD.TWO.utils.extend(TCAD.TWO.Dimension, TCAD.TWO.SketchObject);

TCAD.TWO.Dimension.prototype._class = 'TCAD.TWO.Dimension';

TCAD.TWO.Dimension.prototype.collectParams = function(params) {
};

TCAD.TWO.Dimension.prototype.getReferencePoint = function() {
  return this.a;
};

TCAD.TWO.Dimension.prototype.translateImpl = function(dx, dy) {
};

TCAD.TWO.Dimension.prototype.drawImpl = function(ctx, scale) {

  var off = 30;

  var a = this.flip ? this.b : this.a;
  var b = this.flip ? this.a : this.b;

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


  function drawRef(a) {
    ctx.moveTo(a.x, a.y);
    var off2 = 1.2;
    ctx.lineTo(a.x + _vx * off2, a.y + _vy * off2);
  }

  drawRef(a);
  drawRef(b);

  ctx.closePath();
  ctx.stroke();

  function drawArrow(x, y) {
    var s1 = 50;
    var s2 = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s1, y - s2);
    ctx.stroke();
  }

//  drawArrow(_ax, _ay);
//  drawArrow(_bx, _by);

  ctx.font="12px Arial";
  var txt = d.toFixed(2);
  var h = d / 2 - ctx.measureText(txt).width / 2;

  if (h > 0) {
    var tx = _ax - (- _vyn) * h;
    var ty = _ay - (  _vxn) * h;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.fillText(txt ,0, 0);
    ctx.restore();
  }

};

TCAD.TWO.Dimension.prototype.normalDistance = function(aim) {
  return -1;
};

TCAD.TWO.AddDimTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
  this.dim = null;
  this._v = new TCAD.Vector(0, 0, 0);
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
    this.dim = new TCAD.TWO.Dimension(p, new TCAD.TWO.EndPoint(p.x, p.y));
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

