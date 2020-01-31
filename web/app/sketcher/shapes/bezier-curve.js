import {Ref} from './ref'
import {SketchObject} from './sketch-object'
import {Segment} from './segment'
import {LUT} from '../../math/bezier-cubic'
import {ConvexHull2D} from '../../math/convex-hull'

import * as draw_utils from '../shapes/draw-utils'
import * as math from '../../math/math';
import {Arc} from "./arc";
import {EndPoint} from "./point";


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
      c.role = 'objectConstruction';
    }
  }

  visitParams(callback) {
    this.a.visitParams(callback);
    this.b.visitParams(callback);
    this.cp1.visitParams(callback);
    this.cp2.visitParams(callback);
  }

  normalDistance(aim, scale) {
    this.hull = ConvexHull2D([this.a, this.b, this.cp1, this.cp2]);
    this.hull = math.polygonOffset(this.hull, 1 + (0.3 / scale));
    if (math.isPointInsidePolygon(aim, this.hull)) {
      this.lut = LUT(this.a, this.b, this.cp1, this.cp2, scale);
      return this.closestNormalDistance(aim, this.lut)
    }
    return -1;
  }
  
  closestNormalDistance(aim, segments) {
    let hero = -1;
    for (let p = segments.length - 1, q = 0; q < segments.length; p = q ++) {
      const dist = Math.min(Segment.calcNormalDistance(aim, segments[p], segments[q]));
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

    //debug lut and hull
    //this.drawLUTAndHull();
  }

  drawLUTAndHull() {
    if (this.lut) {
      for (let p of this.lut) {
        draw_utils.DrawPoint(ctx, p.x, p.y, 3, scale);
      }

      ctx.moveTo(this.hull[0].x, this.hull[0].y);
      for (let p of this.hull) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
}
BezierCurve.prototype._class = 'TCAD.TWO.BezierCurve';

const RECOVER_LENGTH = 100;