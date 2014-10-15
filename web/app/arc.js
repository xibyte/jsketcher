
TCAD.TWO.Arc = function(a, b, c) {
  TCAD.TWO.SketchObject.call(this);
  this.a = a;
  this.b = b;
  this.c = c;
  a.parent = this;
  b.parent = this;
  c.parent = this;
  this.children.push(a, b, c);
  this.r = new TCAD.TWO.Ref(0);
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


TCAD.TWO.Arc.prototype.radiusForDrawing = function() {
  return this.distanceA();
};

TCAD.TWO.Arc.prototype.distanceA = function() {
  return TCAD.math.distance(this.a.x, this.a.y, this.c.x, this.c.y);
};

TCAD.TWO.Arc.prototype.distanceB = function() {
  return TCAD.math.distance(this.b.x, this.b.y, this.c.x, this.c.y);
};

TCAD.TWO.Arc.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  var r = this.radiusForDrawing();
  var startAngle = Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
  var endAngle;
  if ( this.a.isCoincidentTo(this.b) || 
      (TCAD.utils.areEqual(this.a.x, this.b.x, TCAD.utils.TOLERANCE) && 
       TCAD.utils.areEqual(this.a.y, this.b.y, TCAD.utils.TOLERANCE))) {
    endAngle = startAngle + 2 * Math.PI;
  } else {
    endAngle = Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
  } 
  ctx.arc(this.c.x, this.c.y, r, startAngle, endAngle);
  ctx.stroke();
};


TCAD.TWO.Arc.prototype.normalDistance = function(aim) {
  return Math.abs(TCAD.math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.radiusForDrawing());
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
    var arc = this.arc;
    this.viewer.parametricManager.system.push(new TCAD.TWO.Constraints.P2PDistanceV(arc.b, arc.c, arc.r));
    this.viewer.parametricManager.system.push(new TCAD.TWO.Constraints.P2PDistanceV(arc.a, arc.c, arc.r));
    this.viewer.toolManager.releaseControl();
  }
};

TCAD.TWO.AddArcTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddArcTool.prototype.mousewheel = function(e) {
};
