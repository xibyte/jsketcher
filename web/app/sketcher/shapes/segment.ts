import {SketchObject, SketchObjectSerializationData} from './sketch-object'
import Vector from 'math/vector';
import {DEG_RAD, makeAngle0_360} from 'math/commons'
import {Param} from "./param";
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint, SketchPointSerializationData} from "./point";
import {distanceAB} from "math/distance";
import {TOLERANCE} from "math/equality";

export class Segment extends SketchObject {

  a: EndPoint;
  b: EndPoint;

  params = {
    ang: new Param(undefined, 'A'),
    t: new Param(undefined, 'T')
  };

  constructor(x1:number, y1:number, x2:number, y2:number, id?: string) {
    super(id);
    this.a = new EndPoint(x1, y1, this.id + ':A');
    this.b = new EndPoint(x2, y2, this.id + ':B');
    this.a.parent = this;
    this.b.parent = this;
    this.children.push(this.a, this.b);
    this.params.ang.normalizer = makeAngle0_360;
    this.params.t.enforceVisualLimit = true;
    this.syncGeometry();
  }

  get ang() {
    return this.params.ang.get();
  }

  get w() {
    return this.nx*this.a.x + this.ny*this.a.y;
  }

  get t() {
    return this.params.t.get();
  }

  get nx() {
    return -Math.sin(this.ang);
  }

  get ny() {
    return Math.cos(this.ang);
  }

  getAngleFromNormal() {
    return this.angleDeg();
  }

  angleDeg() {
    return makeAngle0_360(this.params.ang.get()) / DEG_RAD;
  }


  syncGeometry() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const l = Math.sqrt(dx*dx + dy*dy);

    const ux = (dx / l) || 0;
    const uy = (dy / l) || 0;

    const ang = Math.atan2(uy, ux);

    this.params.ang.set(makeAngle0_360(ang||0));
    this.params.t.set(l);
  }

  stabilize(viewer) {
    this.syncGeometry();
    const c = new AlgNumConstraint(ConstraintDefinitions.Polar, [this, this.a, this.b]);
    c.internal = true;
    this.stage.addConstraint(c);
  }

  recoverIfNecessary() {
    if (distanceAB(this.a, this.b) > TOLERANCE) {
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
    callback(this.params.t);
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

  get labelCenter() {
    return new Vector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2, 0);
  }

  translateImpl(dx, dy) {
    this.a.translate(dx, dy);
    this.b.translate(dx, dy);
  }
  
  drawImpl(ctx, scale) {

    // let ang = this.params.ang.get();
    // let nx = -Math.sin(ang);
    // let ny =  Math.cos(ang);
    // let w = this.w;
    //
    // ctx.save();
    // draw_utils.SetStyle(Styles.CONSTRUCTION_OF_OBJECT, ctx, scale );
    // ctx.beginPath();
    // ctx.moveTo(nx * w + ny * 1000, ny * w - nx * 1000);
    // ctx.lineTo(nx * w - ny * 1000, ny * w + nx * 1000);
    // ctx.stroke();
    // ctx.restore();

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
    return new Segment(this.a.x, this.a.y, this.b.x, this.b.y);
  }

  write(): SketchSegmentSerializationData {
    return {
      a: this.a.write(),
      b: this.b.write()
    }
  }

  static read(id: string, data: SketchSegmentSerializationData): Segment {
    return new Segment(
      data.a.x,
      data.a.y,
      data.b.x,
      data.b.y,
      id
    )
  }
}

export interface SketchSegmentSerializationData extends SketchObjectSerializationData {
  a: SketchPointSerializationData;
  b: SketchPointSerializationData;
}

Segment.prototype._class = 'TCAD.TWO.Segment';
Segment.prototype.TYPE = 'Segment';
