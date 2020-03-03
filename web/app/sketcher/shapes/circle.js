import * as math from '../../math/math';
import {SketchObject} from './sketch-object'
import {Param} from "./param";
import {greaterThanConstraint} from "../constr/barriers";

export const MIN_RADIUS = 100;

export class Circle extends SketchObject {

  constructor(c) {
    super();
    this.c = c;
    c.parent = this;
    this.children.push(c);
    this.r = new Param(MIN_RADIUS + 0.001);
    this.r.constraints = [greaterThanConstraint(MIN_RADIUS)];
    this.r.min = MIN_RADIUS;
  }

  visitParams(callback) {
    this.c.visitParams(callback);
    callback(this.r);
  }
  
  getReferencePoint() {
    return this.c;
  }
  
  translateImpl(dx, dy) {
    this.c.translate(dx, dy);
  }
  
  drawImpl(ctx, scale) {
    ctx.beginPath();
    let r = this.r.get();
    if (r > 0) {
      ctx.arc(this.c.x, this.c.y, r, 0, 2 * Math.PI);
    }
    ctx.stroke();
  }
  
  normalDistance(aim) {
    return Math.abs(math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.r.get());
  }

  copy() {
    const circle = new Circle(this.c.copy());
    circle.r.set(this.r.get());
    return circle;
  }
}

Circle.prototype._class = 'TCAD.TWO.Circle';
