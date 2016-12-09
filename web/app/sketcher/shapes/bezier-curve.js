import {Ref} from './ref'
import {SketchObject} from './sketch-object'
import {Segment} from './segment'

import * as math from '../../math/math';

export class BezierCurve extends SketchObject {

  constructor(a, b, cp1, cp2) {
    super();
    this.a = a;
    this.b = b;
    this.cp1 = cp1;
    this.cp2 = cp2;
    
    this.addChild(new Segment(a, cp1));
    this.addChild(new Segment(b, cp2));
    for (let c of this.children) {
      c.role = 'construction';
    }
  }

  collectParams(params) {
    this.a.collectParams(params);
    this.b.collectParams(params);
    this.cp1.collectParams(params);
    this.cp2.collectParams(params);
  }

  normalDistance() {
    return 1000000;
  }
  
  drawImpl(ctx, scale, viewer) {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.bezierCurveTo(this.cp1.x, this.cp1.y, this.cp2.x, this.cp2.y, this.b.x, this.b.y);
    ctx.stroke();
  }
}
BezierCurve.prototype._class = 'TCAD.TWO.BezierCurve';

const RECOVER_LENGTH = 100;