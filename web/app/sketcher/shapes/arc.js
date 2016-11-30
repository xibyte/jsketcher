import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import Vector from '../../math/vector'
import {Ref} from './ref'
import {Constraints} from '../parametric'
import {SketchObject} from './sketch-object'

export class Arc extends SketchObject {
  
  constructor(a, b, c) {
    super();
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
    
  collectParams(params) {
    this.a.collectParams(params);
    this.b.collectParams(params);
    this.c.collectParams(params);
    params.push(this.r);
  }
  
  getReferencePoint() {
    return this.c;
  }
  
  translateImpl(dx, dy) {
    this.a.translate(dx, dy);
    this.b.translate(dx, dy);
    this.c.translate(dx, dy);
  }
  
  
  radiusForDrawing() {
    return this.distanceA();
  }
  
  distanceA() {
    return math.distance(this.a.x, this.a.y, this.c.x, this.c.y);
  }
  
  distanceB() {
    return math.distance(this.b.x, this.b.y, this.c.x, this.c.y);
  }
  
  getStartAngle() {
    return Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
  }
  
  getEndAngle() {
    return Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
  }
  
  drawImpl(ctx, scale) {
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
  }
  
  isPointInsideSector(x, y) {
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
  }
  
  normalDistance(aim) {
  
    var isInsideSector = this.isPointInsideSector(aim.x, aim.y);
    if (isInsideSector) {
      return Math.abs(math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.radiusForDrawing());
    } else {
      return Math.min(
        math.distance(aim.x, aim.y, this.a.x, this.a.y),
        math.distance(aim.x, aim.y, this.b.x, this.b.y)
      );
    }
  }
  
  stabilize(viewer) {
    this.r.set(this.distanceA());
    viewer.parametricManager._add(new Constraints.P2PDistanceV(this.b, this.c, this.r));
    viewer.parametricManager._add(new Constraints.P2PDistanceV(this.a, this.c, this.r));
  }
}

Arc.prototype._class = 'TCAD.TWO.Arc';
