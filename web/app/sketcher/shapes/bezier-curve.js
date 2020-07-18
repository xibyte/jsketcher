import {SketchObject} from './sketch-object'
import {Segment} from './segment'
import {LUT} from '../../math/bezier-cubic'
import {ConvexHull2D} from '../../math/convex-hull'

import * as draw_utils from '../shapes/draw-utils'
import * as math from '../../math/math';
import {EndPoint} from "./point";


export class BezierCurve extends SketchObject {

  constructor(ax, ay, cp1x, cp1y, cp2x, cp2y, bx, by, id) {
    super(id);
    const s1 = new Segment(ax, ay, cp1x, cp1y, this.id + ':1');
    const s2 = new Segment(bx, by, cp2x, cp2y, this.id + ':2');
    this.addChild(s1);
    this.addChild(s2);

    this.a = s1.a;
    this.b = s2.b;
    this.cp1 = s1.b;
    this.cp2 = s2.a;
    
    for (let c of this.children) {
      c.role = 'objectConstruction';
    }
  }

  get p0() {
    return this.a;
  }
  get p1() {
    return this.cp1;
  }
  get p2() {
    return this.cp2;
  }
  get p3() {
    return this.b;
  }

  stabilize(viewer) {
    this.children.forEach(c => c.stabilize(viewer));
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
      if (dist !== -1) {
        hero = hero === -1 ? dist : Math.min(dist, hero);
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

  write() {
    return {
      cp1: this.a.write(),
      cp2: this.cp1.write(),
      cp3: this.cp2.write(),
      cp4: this.b.write()
    };
  }

  static read(id, data) {
    return new BezierCurve(
      data.cp1.x,
      data.cp1.y,
      data.cp2.x,
      data.cp2.y,
      data.cp3.x,
      data.cp3.y,
      data.cp4.x,
      data.cp4.y,
      id
    )
  }
}

BezierCurve.prototype.TYPE = 'BezierCurve';

BezierCurve.prototype._class = 'TCAD.TWO.BezierCurve';

const RECOVER_LENGTH = 100;