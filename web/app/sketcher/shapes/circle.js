import {SketchObject} from './sketch-object'
import {Param} from "./param";
import {EndPoint} from "./point";
import {distance} from "math/distance";

export const MIN_RADIUS = 100;

export class Circle extends SketchObject {

  constructor(cx, cy, r = 0, id) {
    super(id);
    this.c = new EndPoint(cx, cy, this.id + ':C');
    this.c.parent = this;
    this.children.push(this.c);
    this.r = new Param(r, 'R');
    this.r.enforceVisualLimit = true;
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
    return Math.abs(distance(aim.x, aim.y, this.c.x, this.c.y) - this.r.get());
  }

  copy() {
    const circle = new Circle(this.c.copy());
    circle.r.set(this.r.get());
    return circle;
  }

  write() {
    return {
      c: this.c.write(),
      r: this.r.get()
    }
  }

  static read(id, data) {
    return new Circle(
      data.c.x,
      data.c.y,
      data.r,
      id
    )
  }

}

Circle.prototype._class = 'TCAD.TWO.Circle';
Circle.prototype.TYPE = 'Circle';