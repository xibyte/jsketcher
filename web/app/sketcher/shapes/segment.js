import {SketchObject} from './sketch-object'
import Vector from '../../math/vector'
import {Constraints} from '../parametric'
import * as math from '../../math/math'

export class Segment extends SketchObject {

  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
    a.parent = this;
    b.parent = this;
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
  
  collectParams(params) {
    this.a.collectParams(params);
    this.b.collectParams(params);
  }
  
  normalDistance(aim) {
    var x = aim.x;
    var y = aim.y;
  
    var ab = new Vector(this.b.x - this.a.x, this.b.y - this.a.y)
    var e = ab.normalize();
    var a = new Vector(aim.x - this.a.x, aim.y - this.a.y);
    var b = e.multiply(a.dot(e));
    var n = a.minus(b);
  
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
  }
}

Segment.prototype._class = 'TCAD.TWO.Segment';

