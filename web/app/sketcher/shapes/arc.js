import * as math from '../../math/math';
import Vector from 'math/vector';
import {SketchObject} from './sketch-object';
import {Param} from "./param";
import {greaterThanConstraint} from "../constr/barriers";
import {MIN_RADIUS} from "./circle";
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {makeAngle0_360} from "../../math/math";

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

    this.r = new Param(MIN_RADIUS + 0.001, 'R');
    this.r.constraints = [greaterThanConstraint(MIN_RADIUS)];
    this.r.min = MIN_RADIUS;

    this.ang1 = new Param(0, 'A');
    this.ang2 = new Param(0, 'A');

    this.syncGeometry();
  }

  syncGeometry() {
    this.ang1.set(this.calcStartAng());
    this.ang2.set(this.calcEndAng());
    this.r.set(this.distanceA());
  }

  visitParams(callback) {
    callback(this.r);
    callback(this.ang1);
    callback(this.ang2);
    this.a.visitParams(callback);
    this.b.visitParams(callback);
    this.c.visitParams(callback);
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
    return this.r.get();
  }
  
  distanceA() {
    return math.distance(this.a.x, this.a.y, this.c.x, this.c.y);
  }
  
  distanceB() {
    return math.distance(this.b.x, this.b.y, this.c.x, this.c.y);
  }

  calcStartAng() {
    return Math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
  }

  calcEndAng() {
    return Math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
  }

  getStartAngle() {
    return this.ang1.get();
  }
  
  getEndAngle() {
    return this.ang2.get();
  }
  
  drawImpl(ctx, scale) {
    ctx.beginPath();
    let r = this.radiusForDrawing();
    let startAngle = makeAngle0_360(this.getStartAngle());
    let endAngle;
    if (math.areEqual(this.a.x, this.b.x, math.TOLERANCE) &&
        math.areEqual(this.a.y, this.b.y, math.TOLERANCE)) {
      endAngle = startAngle + 2 * Math.PI;
    } else {
      endAngle = makeAngle0_360(this.getEndAngle());
    }
    if (r > 0) {
      ctx.arc(this.c.x, this.c.y, r, startAngle, endAngle);
    }
    let distanceB = this.distanceB();
    if (Math.abs(r - distanceB) * scale > 1) {
      let adj = r / distanceB;
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
    this.syncGeometry();
    const constr = new AlgNumConstraint(ConstraintDefinitions.ArcConsistency, [this]);
    constr.internal = true;
    viewer.parametricManager._add(constr);
  }

  copy() {
    return new Arc(this.a.copy(), this.b.copy(), this.c.copy());
  }

  mirror(dest, mirroringFunc) {
    this.a.mirror(dest.b, mirroringFunc);
    this.b.mirror(dest.a, mirroringFunc);
    this.c.mirror(dest.c, mirroringFunc);
  }
}

Arc.prototype._class = 'TCAD.TWO.Arc';
