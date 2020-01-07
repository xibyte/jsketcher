import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import {EditCircleTool} from '../tools/circle'

import {EndPoint} from './point'
import {Ref} from './ref'
import {SketchObject} from './sketch-object'

export class Circle extends SketchObject {

  constructor(c) {
    super();
    this.c = c;
    c.parent = this;
    this.children.push(c);
    this.r = new Ref(0);
    this.r.obj = this;
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
    ctx.arc(this.c.x, this.c.y, this.r.get(), 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  normalDistance(aim) {
    return Math.abs(math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.r.get());
  }
}

Circle.prototype._class = 'TCAD.TWO.Circle';
Circle.prototype.TYPE = 'CIRCLE';