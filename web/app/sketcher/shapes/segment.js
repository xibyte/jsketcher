import {SketchObject} from './sketch-object'
import Vector from 'math/vector';
import * as math from '../../math/math'
import {Styles} from "../styles";
import * as draw_utils from "./draw-utils";
import {Param} from "./param";
import {Constraints} from "../constraints";
import {ConstraintDefinitions, AlgNumConstraint} from "../constr/ANConstraints";
import {Ellipse} from "./ellipse";

export class Segment extends SketchObject {

  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
    a.parent = this;
    b.parent = this;
    this.children.push(a, b);
    this.params = {
      ang: new Param(undefined),
      w: new Param(undefined),
      t: new Param(undefined)
    };
    this.syncGeometry();
  }

  get ang() {
    return this.params.ang.get();
  }

  get w() {
    return this.params.w.get();
  }

  get t() {
    return this.params.t.get();
  }

  syncGeometry() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const l = Math.sqrt(dx*dx + dy*dy);

    let nx = (- dy / l) || 0;
    let ny = (dx / l) || 0;

    let ang = Math.atan2(ny, nx);

    this.params.ang.set(ang||0);
    this.params.w.set(nx * this.a.x + ny * this.a.y);
    this.params.t.set(l);
  }

  stabilize(viewer) {
    this.syncGeometry();
    const c1 = new AlgNumConstraint(ConstraintDefinitions.PointOnLine, [this.a, this]);
    const c2 = new AlgNumConstraint(ConstraintDefinitions.Polar, [this, this.a, this.b]);
    c1.internal = true;
    c2.internal = true;
    viewer.parametricManager.addAlgNum(c1);
    viewer.parametricManager.addAlgNum(c2);
  }

  recoverIfNecessary() {
    if (math.distanceAB(this.a, this.b) > math.TOLERANCE) {
      return false;
    } else {
      const recoverLength = 100;
      this.a.translate(-recoverLength, -recoverLength);
      this.b.translate( recoverLength,  recoverLength);
      return true;
    }
  }

  visitParams(callback) {
    this.a.visitParams(callback);
    this.b.visitParams(callback);
    callback(this.params.ang);
    callback(this.params.w);
  }

  normalDistance(aim) {
    return Segment.calcNormalDistance(aim, this.a, this.b);
  }

  static calcNormalDistance(aim, segmentA, segmentB) {
    const ab = new Vector(segmentB.x - segmentA.x, segmentB.y - segmentA.y)
    const e = ab.normalize();
    const a = new Vector(aim.x - segmentA.x, aim.y - segmentA.y);
    const b = e.multiply(a.dot(e));
    const n = a.minus(b);
  
    //Check if vector b lays on the vector ab
    if (b.length() > ab.length()) {
      return -1;
    }
  
    if (b.dot(ab) < 0) {
      return -1;
    }
  
    return n.length();
  }
  
  getReferencePoint() {
    return this.a;
  }
  
  translateImpl(dx, dy) {
    this.a.translate(dx, dy);
    this.b.translate(dx, dy);
    this.params.w.set(Math.cos(this.ang) * this.a.x + Math.sin(this.ang) * this.a.y);
  }
  
  drawImpl(ctx, scale) {

    let ang = this.params.ang.get();
    let nx = Math.cos(ang) ;
    let ny = Math.sin(ang) ;
    let w = this.params.w.get();

    ctx.save();
    draw_utils.SetStyle(Styles.CONSTRUCTION_OF_OBJECT, ctx, scale );
    ctx.beginPath();
    ctx.moveTo(nx * w + ny * 1000, ny * w - nx * 1000);
    ctx.lineTo(nx * w - ny * 1000, ny * w + nx * 1000);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    //  ctx.save();
    //  ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.stroke();
    //  ctx.restore();

  }

  opposite(endPoint) {
    if (endPoint === this.a) {
      return this.b;
    } else if (endPoint === this.b) {
      return this.a;
    } else {
      return null;
    }
  }

  copy() {
    return new Segment(this.a.copy(), this.b.copy());
  }
}

Segment.prototype._class = 'TCAD.TWO.Segment';

Segment.prototype.TYPE = 'SEGMENT';
