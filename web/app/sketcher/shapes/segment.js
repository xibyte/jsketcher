import {SketchObject} from './sketch-object'
import Vector from 'math/vector';
import {Constraints} from '../parametric'
import * as math from '../../math/math'
import {GCLine} from "../constr/constractibles";
import {Styles} from "../styles";
import * as draw_utils from "./draw-utils";

export class Segment extends SketchObject {

  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
    a.parent = this;
    b.parent = this;
    this.gcLine = new GCLine();


    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.sqrt(dx*dx + dy*dy);

    let nx = - dy / l;
    let ny = dx / l;
    const ang = Math.atan2(ny, nx);

    this.gcLine.ang.set(ang);
    this.gcLine.w.set(nx * a.x + ny * a.y);

    this.children.push(a, b);
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
  }
  
  drawImpl(ctx, scale) {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
  //  ctx.save();
  //  ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.stroke();
  //  ctx.restore();


    let ang = this.gcLine.ang.get();
    let nx = Math.cos(ang) ;
    let ny = Math.sin(ang) ;
    let w = this.gcLine.w.get();

    ctx.save();
    draw_utils.SetStyle(Styles.CONSTRUCTION_OF_OBJECT, ctx, scale );
    ctx.beginPath();
    ctx.moveTo(nx * w + ny * 1000, ny * w - nx * 1000);
    ctx.lineTo(nx * w - ny * 1000, ny * w + nx * 1000);
    ctx.stroke();
    ctx.restore();


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

