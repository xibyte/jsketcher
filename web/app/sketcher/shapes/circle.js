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
    
  collectParams(params) {
    this.c.collectParams(params);
    params.push(this.r);
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
  
  getDefaultTool(viewer) {
    var editTool = new EditCircleTool(viewer, null);
    editTool.circle = this;
    return editTool;
  }
}

Circle.prototype._class = 'TCAD.TWO.Circle';
