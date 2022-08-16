import {makeAngle0_360} from 'math/commons';
import Vector from 'math/vector';
import {SketchObject, SketchObjectSerializationData} from './sketch-object';
import {Param} from "./param";
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint, SketchPointSerializationData} from "./point";
import {distance} from "math/distance";
import {areEqual, TOLERANCE} from "math/equality";

export class Arc extends SketchObject {

  a: EndPoint;
  b: EndPoint;
  c: EndPoint;
  r: Param;
  ang1: Param;
  ang2: Param;
  
  constructor(ax, ay, bx, by, cx, cy, id?: string) {
    super(id);
    this.a = new EndPoint(ax, ay, this.id + ':A');
    this.b = new EndPoint(bx, by, this.id + ':B');
    this.c = new EndPoint(cx, cy, this.id + ':C');

    this.a.parent = this;
    this.b.parent = this;
    this.c.parent = this;
    this.children.push(this.a, this.b, this.c);

    this.r = new Param(0, 'R');
    this.r.enforceVisualLimit = true;

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
    return distance(this.a.x, this.a.y, this.c.x, this.c.y);
  }
  
  distanceB() {
    return distance(this.b.x, this.b.y, this.c.x, this.c.y);
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

  get labelCenter() {
    const mid = new Vector((this.a.x + this.b.x) / 2 - this.c.x, (this.a.y + this.b.y) / 2 - this.c.y, 0);
    mid._normalize()._multiply(this.r.get());
    const angle = makeAngle0_360(this.getEndAngle() - this.getStartAngle());
    if (angle > Math.PI) {
      mid._negate();
    }
    return mid._minusXYZ(-this.c.x, -this.c.y, 0);
  }

  drawImpl(ctx, scale) {
    ctx.beginPath();
    const r = this.radiusForDrawing();
    const startAngle = makeAngle0_360(this.getStartAngle());
    let endAngle;
    if (areEqual(this.a.x, this.b.x, TOLERANCE) &&
        areEqual(this.a.y, this.b.y, TOLERANCE)) {
      endAngle = startAngle + 2 * Math.PI;
    } else {
      endAngle = makeAngle0_360(this.getEndAngle());
    }
    if (r > 0) {
      ctx.arc(this.c.x, this.c.y, r, startAngle, endAngle);
    }
    const distanceB = this.distanceB();
    if (Math.abs(r - distanceB) * scale > 1) {
      const adj = r / distanceB;
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
    const ca = new Vector(this.a.x - this.c.x, this.a.y - this.c.y);
    const cb = new Vector(this.b.x - this.c.x, this.b.y - this.c.y);
    const ct = new Vector(x - this.c.x, y - this.c.y);
  
    ca._normalize();
    cb._normalize();
    ct._normalize();
    const cosAB = ca.dot(cb);
    const cosAT = ca.dot(ct);
  
    const isInside = cosAT >= cosAB;
    const abInverse = ca.cross(cb).z < 0;
    const atInverse = ca.cross(ct).z < 0;
  
    let result;
    if (abInverse) {
      result = !atInverse || !isInside;
    } else {
      result = !atInverse && isInside;
    }
    return result;
  }
  
  normalDistance(aim) {
  
    const isInsideSector = this.isPointInsideSector(aim.x, aim.y);
    if (isInsideSector) {
      return Math.abs(distance(aim.x, aim.y, this.c.x, this.c.y) - this.radiusForDrawing());
    } else {
      return Math.min(
        distance(aim.x, aim.y, this.a.x, this.a.y),
        distance(aim.x, aim.y, this.b.x, this.b.y)
      );
    }
  }
  
  stabilize(viewer) {
    this.syncGeometry();
    const constr = new AlgNumConstraint(ConstraintDefinitions.ArcConsistency, [this]);
    constr.internal = true;
    this.stage.addConstraint(constr);
  }

  copy() {
    return new Arc(this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y);
  }

  mirror(dest, mirroringFunc) {
    this.a.mirror(dest.b, mirroringFunc);
    this.b.mirror(dest.a, mirroringFunc);
    this.c.mirror(dest.c, mirroringFunc);
  }

  write(): SketchArcSerializationData {
    return {
      a: this.a.write(),
      b: this.b.write(),
      c: this.c.write()
    };
  }

  static read(id: string, data: SketchArcSerializationData): Arc {
    return new Arc(
      data.a.x,
      data.a.y,
      data.b.x,
      data.b.y,
      data.c.x,
      data.c.y,
      id
    )
  }
}

export interface SketchArcSerializationData extends SketchObjectSerializationData {
  a: SketchPointSerializationData;
  b: SketchPointSerializationData;
  c: SketchPointSerializationData;
}

Arc.prototype.TYPE = 'Arc';

Arc.prototype._class = 'TCAD.TWO.Arc';
