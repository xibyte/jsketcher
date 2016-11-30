import {SketchObject} from './sketch-object'
import {DrawPoint} from './draw-utils'
import {Generator} from '../id-generator'
import Vector from '../../math/vector'

export class EndPoint extends SketchObject {

  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
    this.parent = null;
    this._x = new Param(this, 'x');
    this._y = new Param(this, 'y');
  }
  
  collectParams(params) {
    params.push(this._x);
    params.push(this._y);
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
