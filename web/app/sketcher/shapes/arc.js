import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import Vector from '../../math/vector'
import {SketchObject, EndPoint, Ref} from '../viewer2d'
import {Constraints} from '../parametric'

/** @constructor */
function Arc(a, b, c) {
  SketchObject.call(this);
  this.a = a;
  this.b = b;
  this.c = c;
  a.parent = this;
  b.parent = this;
  c.parent = this;
  this.children.push(a, b, c);
  this.r = new Ref(0);
  this.r.value = this.distanceA();
  this.r.obj = this;
}

utils.extend(Arc, SketchObject);

Arc.prototype._class = 'TCAD.TWO.Arc';

Arc.prototype.collectParams = function(params) {
  this.a.collectParams(params);
  this.b.collectParams(params);
  this.c.collectParams(params);
  params.push(this.r);
};

Arc.prototype.getReferencePoint = function() {
  return this.c;
};

Arc.prototype.translateImpl = function(dx, dy) {
  this.a.translate(dx, dy);
  this.b.translate(dx, dy);
  this.c.translate(dx, dy);
};


Arc.prototype.radiusForDrawing = function() {
  return this.distanceA();
};

Arc.prototype.distanceA = function() {
  return math.distance(this.a.x, this.a.y, this.c.x, this.c.y);
};

Arc.prototype.distanceB = function() {
  return math.distance(this.b.x, this.b.y, this.c.x, this.c.y);
};

Arc.prototype.getStartAngle = function() {
  return Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
};

Arc.prototype.getEndAngle = function() {
  return Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
};

Arc.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  var r = this.radiusForDrawing();
  var startAngle = this.getStartAngle();
  var endAngle;
  if (math.areEqual(this.a.x, this.b.x, math.TOLERANCE) &&
      math.areEqual(this.a.y, this.b.y, math.TOLERANCE)) {
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

Arc.prototype.isPointInsideSector = function(x, y) {
  var ca = new Vector(this.a.x - this.c.x, this.a.y - this.c.y);
  var cb = new Vector(this.b.x - this.c.x, this.b.y - this.c.y);
  var ct = new Vector(x - this.c.x, y - this.c.y);

  ca._normalize();
  cb._normalize();
  ct._normalize();
  var cosAB = ca.dot(cb);
  var cosAT = ca.dot(ct);

  var isInside = cosAT >= cosAB;
  var abInverse = ca.cross(cb).z < 0;
  var atInverse = ca.cross(ct).z < 0;

  var result;
  if (abInverse) {
    result = !atInverse || !isInside;
  } else {
    result = !atInverse && isInside;
  }
  return result;
};

Arc.prototype.normalDistance = function(aim) {

  var isInsideSector = this.isPointInsideSector(aim.x, aim.y);
  if (isInsideSector) {
    return Math.abs(math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.radiusForDrawing());
  } else {
    return Math.min(
      math.distance(aim.x, aim.y, this.a.x, this.a.y),
      math.distance(aim.x, aim.y, this.b.x, this.b.y)
    );
  }
};

Arc.prototype.stabilize = function(viewer) {
  this.r.set(this.distanceA());
  viewer.parametricManager._add(new Constraints.P2PDistanceV(this.b, this.c, this.r));
  viewer.parametricManager._add(new Constraints.P2PDistanceV(this.a, this.c, this.r));
};

/** @constructor */
function AddArcTool(viewer) {
  this.viewer = viewer;
  this.arc = null;
  this.point = null;
  this._v = new Vector(0, 0, 0);
}

AddArcTool.prototype.keydown = function(e) {};
AddArcTool.prototype.keypress = function(e) {};
AddArcTool.prototype.keyup = function(e) {};
AddArcTool.prototype.cleanup = function(e) {};

AddArcTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  if (this.point != null) {
    this.point.x = p.x;
    this.point.y = p.y;

    var r = math.distance(this.arc.a.x, this.arc.a.y, this.arc.c.x, this.arc.c.y);
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

AddArcTool.prototype.mouseup = function(e) {
  if (this.arc == null) {
    this.viewer.historyManager.checkpoint();
    var p = this.viewer.screenToModel(e);
    this.arc = new Arc(
      new EndPoint(p.x, p.y),
      new EndPoint(p.x, p.y),
      new EndPoint(p.x, p.y)
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

AddArcTool.prototype.snapIfNeed = function(p) {
  if (this.viewer.snapped.length != 0) {
    var snapWith = this.viewer.snapped.pop();
    this.viewer.cleanSnap();
    this.viewer.parametricManager.linkObjects([p, snapWith]);
    this.viewer.parametricManager.refresh();
  }
};

AddArcTool.prototype.mousedown = function(e) {
};

AddArcTool.prototype.mousewheel = function(e) {
};

export {Arc, AddArcTool}