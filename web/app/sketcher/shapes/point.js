import {SketchObject} from './sketch-object'
import {DrawPoint} from './draw-utils'
import {Generator} from '../id-generator'
import Vector from 'math/vector';
import {GCPoint} from "../constr/constractibles";

export class EndPoint extends SketchObject {

  constructor(x, y) {
    super();
    this.parent = null;
    this.gcPoint = new GCPoint();
    this._x = this.gcPoint.x; // legacy - yet to remove
    this._y = this.gcPoint.y;
    this.x = x;
    this.y = y;
  }

  get x() {
    return this.gcPoint.x.get();
  }

  set x(val) {
    return this.gcPoint.x.set(val);
  }

  get y() {
    return this.gcPoint.y.get();
  }

  set y(val) {
    return this.gcPoint.y.set(val);
  }

  coincideWith(gcPoint) {
    if (!this.parkedOwnGeometry) {
      this.parkedOwnGeometry = this.gcPoint;
    }
    this.gcPoint = gcPoint;
  }

  visitParams(callback) {
    callback(this._x);
    callback(this._y);
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

export class Param {
  constructor(obj, prop) {
    this.id = Generator.genID();
    this.obj = obj;
    this.prop = prop;
  }

  set(value) {
    this.obj[this.prop] = value;
  }

  get() {
    return this.obj[this.prop];
  }
}
