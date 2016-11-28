import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import Vector from '../../math/vector'
import {SketchObject, Ref} from '../viewer2d'
import {Constraints} from '../parametric'

/** @constructor */
export function Arc(a, b, c) {
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

