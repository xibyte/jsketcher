/** @constructor */
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
  this.r.value = this.distanceA();
  this.r.obj = this;
};

TCAD.TWO.utils.extend(TCAD.TWO.Arc, TCAD.TWO.SketchObject);

TCAD.TWO.Arc.prototype._class = 'TCAD.TWO.Arc';

TCAD.TWO.Arc.prototype.collectParams = function(params) {
  this.a.collectParams(params);
  this.b.collectParams(params);
  this.c.collectParams(params);
  params.push(this.r);
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

TCAD.TWO.Arc.prototype.getStartAngle = function() {
  return Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
};

TCAD.TWO.Arc.prototype.getEndAngle = function() {
  return Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
};

TCAD.TWO.Arc.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  var r = this.radiusForDrawing();
  var startAngle = this.getStartAngle();
  var endAngle;
  if (TCAD.utils.areEqual(this.a.x, this.b.x, TCAD.TOLERANCE) &&
      TCAD.utils.areEqual(this.a.y, this.b.y, TCAD.TOLERANCE)) {
    endAngle = startAngle + 2 * Math.PI;
  } else {
    endAngle = this.getEndAngle();
  }
  ctx.arc(this.c.x, this.c.y, r, startAngle, endAngle);
  var distanceB = this.distanceB();
  if (Math.abs(r - distanceB) * scale > 1) {
    var adj = r / distanceB;
    ctx.save();
    ctx.setLineDash([7 / scale]);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.moveTo(this.b.x + (this.b.x - this.c.x) / adj, this.b.y + (this.b.y - this.c.y) / adj);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.stroke();
  }
};


TCAD.TWO.Arc.prototype.normalDistance = function(aim) {
  var aimAngle = Math.atan2(this.c.y - aim.y, this.c.x - aim.x);
  if (aimAngle <= this.getStartAngle() && aimAngle >= this.getEndAngle()) {
    return Math.abs(TCAD.math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.radiusForDrawing());  
  } else {
    return Math.min(
      TCAD.math.distance(aim.x, aim.y, this.a.x, this.a.y),
      TCAD.math.distance(aim.x, aim.y, this.b.x, this.b.y)
    );
  }
};

TCAD.TWO.Arc.prototype.stabilize = function(viewer) {
  this.r.set(this.distanceA());
  viewer.parametricManager._add(new TCAD.TWO.Constraints.P2PDistanceV(this.b, this.c, this.r));
  viewer.parametricManager._add(new TCAD.TWO.Constraints.P2PDistanceV(this.a, this.c, this.r));
};

/** @constructor */
TCAD.TWO.AddArcTool = function(viewer) {
  this.viewer = viewer;
  this.arc = null;
  this.point = null;
  this._v = new TCAD.Vector(0, 0, 0);
};

TCAD.TWO.AddArcTool.prototype.keydown = function(e) {};
TCAD.TWO.AddArcTool.prototype.keypress = function(e) {};
TCAD.TWO.AddArcTool.prototype.keyup = function(e) {};
TCAD.TWO.AddArcTool.prototype.cleanup = function(e) {};

TCAD.TWO.AddArcTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  if (this.point != null) {
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

    this.viewer.snap(p.x, p.y, [this.arc.a, this.arc.b, this.arc.c]);
    this.viewer.refresh();
  } else {
    this.viewer.snap(p.x, p.y, []);
    this.viewer.refresh();
  }
};

TCAD.TWO.AddArcTool.prototype.mouseup = function(e) {
  if (this.arc == null) {
    this.viewer.historyManager.checkpoint();
    var p = this.viewer.screenToModel(e);
    this.arc = new TCAD.TWO.Arc(
      new TCAD.TWO.EndPoint(p.x, p.y),
      new TCAD.TWO.EndPoint(p.x, p.y),
      new TCAD.TWO.EndPoint(p.x, p.y)
    );
    this.point = this.arc.a;
    this.viewer.activeLayer.objects.push(this.arc);
    this.snapIfNeed(this.arc.c);
    this.viewer.refresh();
  } else if (this.point.id === this.arc.a.id) {
    this.snapIfNeed(this.arc.a);
    this.point = this.arc.b;
  } else {
    this.snapIfNeed(this.arc.b);
    this.arc.stabilize(this.viewer);
    this.viewer.toolManager.releaseControl();
  }
};

TCAD.TWO.AddArcTool.prototype.snapIfNeed = function(p) {
  if (this.viewer.snapped.length != 0) {
    var snapWith = this.viewer.snapped.pop();
    this.viewer.cleanSnap();
    this.viewer.parametricManager.linkObjects([p, snapWith]);
    this.viewer.parametricManager.refresh();
  }
};

TCAD.TWO.AddArcTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddArcTool.prototype.mousewheel = function(e) {
};
