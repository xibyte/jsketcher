import {Ref} from './ref'
import {SketchObject} from './sketch-object'
import {Segment} from './segment'
import {LUT} from '../../math/bezier-cubic'
import * as draw_utils from '../shapes/draw-utils'

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

  normalDistance(aim, scale) {
    this.lut = LUT(this.a, this.b, this.cp1, this.cp2, scale);
    const lut = this.lut;
    let hero = -1;
    for (let p = lut.length - 1, q = 0; q < lut.length; p = q ++) {
      const dist = Math.min(Segment.calcNormalDistance(aim, lut[p], lut[q]));        
      if (dist != -1) {
        hero = hero == -1 ? dist : Math.min(dist, hero);
      }
    }
    return hero;
  }
  
  drawImpl(ctx, scale, viewer) {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.bezierCurveTo(this.cp1.x, this.cp1.y, this.cp2.x, this.cp2.y, this.b.x, this.b.y);
    ctx.stroke();
    
    //debug lut
    if (this.lut) {
      for (let p of this.lut) {
        draw_utils.DrawPoint(ctx, p.x, p.y, 3, scale);
      }
    }
  }
}
BezierCurve.prototype._class = 'TCAD.TWO.BezierCurve';

const RECOVER_LENGTH = 100;