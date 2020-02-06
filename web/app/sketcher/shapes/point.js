import {SketchObject} from './sketch-object'
import {DrawPoint} from './draw-utils'
import Vector from 'math/vector';
import {Param} from "./param";


export class EndPoint extends SketchObject {

  constructor(x, y) {
    super();
    this.parent = null;
    this.params  = {
      x: new Param(x),
      y: new Param(y)
    };
  }

  get x() {
    return this.params.x.get();
  }

  set x(val) {
    return this.params.x.set(val);
  }

  get y() {
    return this.params.y.get();
  }

  set y(val) {
    return this.params.y.set(val);
  }

  visitParams(callback) {
    callback(this.params.x);
    callback(this.params.y);
  }

  normalDistance(aim) {
    return aim.minus(new Vector(this.x, this.y)).length();
  }

  getReferencePoint() {
    return this;
  }

  translateImpl(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  drawImpl(ctx, scale) {
    DrawPoint(ctx, this.x, this.y, 3, scale)
  }

  setXY(x, y) {
    this.x = x;
    this.y = y;
  }

  setFromPoint(p) {
    this.setXY(p.x, p.y);
  }

  setFromArray(arr) {
    this.setXY(arr[0], arr[1]);
  }

  toVector() {
    return new Vector(this.x, this.y);
  }

  copy() {
    return new EndPoint(this.x, this.y);
  }

  mirror(dest, mirroringFunc) {
    let {x, y} = mirroringFunc(this.x, this.y);
    dest.x = x;
    dest.y = y;
  }
}

EndPoint.prototype._class = 'TCAD.TWO.EndPoint';

