
TCAD.TWO.Arc = function(a, b, c) {
  TCAD.TWO.SketchObject.call(this);
  this.a = a;
  this.b = b;
  this.c = c;
  a.parent = this;
  b.parent = this;
  c.parent = this;
};

TCAD.TWO.utils.extend(TCAD.TWO.Arc, TCAD.TWO.SketchObject);

TCAD.TWO.Arc.prototype._class = 'TCAD.TWO.Arc';

TCAD.TWO.Arc.prototype.collectParams = function(params) {
  this.a.collectParams(params);
  this.b.collectParams(params);
  this.c.collectParams(params);
};

TCAD.TWO.Arc.prototype.draw = function(ctx, scale) {
  TCAD.TWO.SketchObject.prototype.draw.call(this, ctx, scale);
  this.a.draw(ctx, scale);
  this.b.draw(ctx, scale);
  this.c.draw(ctx, scale);
};

TCAD.TWO.Arc.prototype.getReferencePoint = function() {
  return this.c;
};

TCAD.TWO.Arc.prototype.translateImpl = function(dx, dy) {
  this.a.translate(dx, dy);
  this.b.translate(dx, dy);
  this.c.translate(dx, dy);
};

TCAD.TWO.Arc.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  var r = TCAD.math.distance(this.a.x, this.a.y, this.c.x, this.c.y);
  ctx.arc(this.c.x, this.c.y, r,
    Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x),
    Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x));
  ctx.stroke();
};

TCAD.TWO.Arc.prototype.visit = function(h) {
  return this.a.visit(h) 
      && this.b.visit(h)
      && this.c.visit(h) 
      && h(this);
};

TCAD.TWO.Arc.prototype.normalDistance = function(aim) {
  return 1000;
};


TCAD.TWO.AddArcTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
  this.arc = null;
  this.point = null;
  this._v = new TCAD.Vector(0, 0, 0);
};

TCAD.TWO.AddArcTool.prototype.mousemove = function(e) {
  if (this.point != null) {
    var p = this.viewer.screenToModel(e);
    this.point.x = p.x;
    this.point.y = p.y;

    var r = TCAD.math.distance(this.arc.a.x, this.arc.a.y, this.arc.c.x, this.arc.c.y);
    if (this.point.id === this.arc.b.id) {
      //force placement second point on the arc
      var v = this._v;
      v.set(this.arc.b.x - this.arc.c.x, this.arc.b.y - this.arc.c.y, 0);
      v._normalize()._multiply(r);
      this.arc.b.x = v.x + this.arc.c.x;
      this.arc.b.y = v.y + this.arc.c.y;
    } else {
      var ang = Math.atan2(this.point.y - this.arc.c.y, this.point.x - this.arc.c.x) + (2 * Math.PI -  0.3);
      
      ang %= 2 * Math.PI; 
      
      this.arc.b.x = this.arc.c.x + r * Math.cos(ang);
      this.arc.b.y = this.arc.c.y + r * Math.sin(ang);
    }

    this.viewer.refresh();
  }
};

TCAD.TWO.AddArcTool.prototype.mouseup = function(e) {
  if (this.arc == null) {
    var p = this.viewer.screenToModel(e);
    this.arc = new TCAD.TWO.Arc(
      new TCAD.TWO.EndPoint(p.x, p.y),
      new TCAD.TWO.EndPoint(p.x, p.y),
      new TCAD.TWO.EndPoint(p.x, p.y)
    );
    this.point = this.arc.a;
    this.layer.objects.push(this.arc);
    this.viewer.refresh();
  } else if (this.point.id === this.arc.a.id) {
    this.point = this.arc.b;
  } else {
    this.viewer.toolManager.releaseControl();
  }
};

TCAD.TWO.AddArcTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddArcTool.prototype.mousewheel = function(e) {
};
