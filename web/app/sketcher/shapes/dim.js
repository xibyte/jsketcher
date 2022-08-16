import {
  DEG_RAD,
  makeAngle0_360} from 'math/commons'
import * as vec from 'math/vec'
import Vector from 'math/vector';
import {Styles} from "../styles";
import {TextHelper} from "./textHelper";
import {isInstanceOf} from "../actions/matchUtils";
import {Arc} from "./arc";
import {SketchObject} from "./sketch-object";
import {distance, distanceAB} from "math/distance";
import {lineLineIntersection2d, pointToLineSignedDistance} from "geom/euclidean";

const ARROW_W_PX = 15;
const ARROW_H_PX = 4;
const ARROW_TO_TEXT_PAD_PX = 2;
const TEXT_H_OFFSET = 3;
const OUTER_ARROW_TO_TEXT_PAD_PX = 6;
const EXT_LINEAR_WIDTH_PX = 7;
const EXT_ANGULAR_WIDTH_PX = 10;

function drawArrow(ctx, x, y, nx, ny, arrowW, arrowH) {
  ctx.beginPath();
  ctx.moveTo(x, y, 0);
  ctx.lineTo(x + ny * arrowW + nx * arrowH, y + -nx * arrowW + ny * arrowH );
  ctx.lineTo(x + ny * arrowW - nx * arrowH, y + -nx * arrowW - ny * arrowH);
  ctx.fill();
}

function drawArrowForArc(ctx, px, py, x, y, nx, ny, arrowW, arrowH) {
  ctx.beginPath();
  ctx.moveTo(x, y, 0);
  ctx.lineTo(px + nx * arrowH, py + ny * arrowH );
  ctx.lineTo(px - nx * arrowH, py - ny * arrowH);
  ctx.fill();
}

function drawExtensionLine(ctx, x, y, nx, ny, width, tip, arrowW) {
  ctx.beginPath();
  ctx.moveTo(x + ny * arrowW, y + -nx * arrowW);

  tip[0] = x + ny * (arrowW + width);
  tip[1] = y + -nx * (arrowW + width);

  ctx.lineTo(tip[0], tip[1]);

  ctx.stroke();
}

export class Dimension extends SketchObject {

  constructor(id) {
    super(id);
  }
}

export class LinearDimension extends Dimension {
  
  constructor(a, b, id) {
    super(id);
    this.a = a;
    this.b = b;
    this.offset = 20;
    this.pickA = [];
    this.pickB = [];
    this.textHelper = new TextHelper()
  }

  visitParams(callback) {
  }
  
  getReferencePoint() {
    return this.a;
  }
  
  translateImpl(dx, dy) {

    const [_ax, _ay]  = this.pickA;
    const [_bx, _by]  = this.pickB;

    const _vx = - (_by - _ay);
    const _vy = _bx - _ax;

    const d = distance(_ax, _ay, _bx, _by);

    //normalize
    const _vxn = _vx / d;
    const _vyn = _vy / d;

    this.offset += (dx *  _vxn + dy * _vyn) * this.unscale;
  }
  
  getA() { return this.a }
  getB() { return this.b }

  dependsOn(obj) {
    return this.a === obj || this.b === obj;
  }

  drawImpl(ctx, scale, viewer) {

    const marked = this.markers.length !== 0;

    if (marked) {
      ctx.save();
      viewer.setStyle(Styles.HIGHLIGHT, ctx);
    }

    const unscale = 1 /scale;
    const off = unscale * this.offset;
    const textOff = unscale * TEXT_H_OFFSET; // getTextOff(dimScale);

    this.unscale = scale;

    const a = this.getB();
    const b = this.getA();
    const startA = this.b;
    const startB = this.a;

    const d = distanceAB(a, b);

    let _vx = - (b.y - a.y);
    let _vy = b.x - a.x;
  
    //normalize
    const _vxn = _vx / d;
    const _vyn = _vy / d;
  
    _vx = _vxn * off;
    _vy = _vyn * off;
  
    ctx.beginPath();

    const _ax = a.x + _vx;
    const _ay = a.y + _vy;
    const _bx = b.x + _vx;
    const _by = b.y + _vy;
  
    ctx.moveTo(_ax, _ay);
    ctx.lineTo(_bx, _by);
  
  
    function drawRef(start, x, y) {
      const vec = new Vector(x - start.x, y - start.y);
      vec._normalize();
      vec._multiply(EXT_LINEAR_WIDTH_PX * unscale);
      
      ctx.moveTo(start.x, start.y );
      ctx.lineTo(x, y);
      ctx.lineTo(x + vec.x, y + vec.y);
    }
  
    drawRef(startA, _ax, _ay);
    drawRef(startB, _bx, _by);

    ctx.stroke();

    const arrowWpx = ARROW_W_PX;
    const arrowW = arrowWpx * unscale;
    const arrowH = ARROW_H_PX * unscale;

    const txt = d.toFixed(2);

    this.textHelper.prepare(txt, ctx, viewer);
    const takenByArrow = viewer.screenToModelDistance(2 * (arrowWpx + ARROW_TO_TEXT_PAD_PX));

    const availableArea = d - takenByArrow;

    const modelTextWidth = this.textHelper.modelTextWidth;

    const innerMode = modelTextWidth <= availableArea;

    let tx, ty;

    if (innerMode) {
      drawArrow(ctx, _ax, _ay, _vxn, _vyn, arrowW, arrowH);
      drawArrow(ctx, _bx, _by, -_vxn, -_vyn, arrowW, arrowH);

      this.pickA[0] = _ax; this.pickA[1] = _ay;
      this.pickB[0] = _bx; this.pickB[1] = _by;

      const h = d/2 - modelTextWidth/2;
      tx = (_ax + _vxn * textOff) - (- _vyn) * h;
      ty = (_ay + _vyn * textOff) - (  _vxn) * h;
    } else {
      drawArrow(ctx, _ax, _ay, -_vxn, -_vyn, arrowW, arrowH);
      drawArrow(ctx, _bx, _by, _vxn, _vyn, arrowW, arrowH);

      drawExtensionLine(ctx, _ax, _ay, -_vxn, -_vyn,  OUTER_ARROW_TO_TEXT_PAD_PX * unscale, this.pickA, arrowW);
      drawExtensionLine(ctx, _bx, _by, _vxn, _vyn,  modelTextWidth + 2 * OUTER_ARROW_TO_TEXT_PAD_PX * unscale, this.pickB, arrowW);

      tx = (_bx + _vxn * textOff) - (- _vyn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
      ty = (_by + _vyn * textOff) - (  _vxn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
    }

    this.textHelper.draw(tx, ty, _vxn, _vyn, ctx, unscale, viewer, textOff);

    if (marked) {
      ctx.restore();
    }

  }

  normalDistance(aim, scale) {

    const textDist = this.textHelper.normalDistance(aim);

    if (textDist !== -1) {
      return textDist;
    }

    const [_ax, _ay]  = this.pickA;
    const [_bx, _by]  = this.pickB;

    const sdist = pointToLineSignedDistance(_ax, _ay, _bx, _by, aim.x, aim.y);
    if (sdist !== sdist) {
      return -1;
    }
    return Math.abs(sdist);

  }

  write() {
    return {
      a: this.a.id,
      b: this.b.id,
      offset: this.offset
    }
  }

  static load(constr, id, data, index) {
    const dim = new constr(
      index[data.a],
      index[data.b],
      id
    );
    dim.offset = data.offset;
    return dim;
  }
}

LinearDimension.prototype._class = 'TCAD.TWO.LinearDimension';
LinearDimension.prototype.TYPE = 'LinearDimension';

export class HDimension extends LinearDimension {
  constructor(a, b, id) {
    super(a, b, id);
  }

  getA() {
    return this.a;
  }
  
  getB() {
    return {x: this.b.x, y: this.a.y};
  }
}
HDimension.prototype._class = 'TCAD.TWO.HDimension';
HDimension.prototype.TYPE = 'HDimension';

export class VDimension extends LinearDimension {
  
  constructor(a, b, id) {
    super(a, b, id);
  }

  getA() {
    return this.a;
  }

  getB() {
    return {x: this.a.x, y: this.b.y};
  }
}
VDimension.prototype._class = 'TCAD.TWO.VDimension';
VDimension.prototype.TYPE = 'VDimension';


export class DiameterDimension extends Dimension {
  
  constructor(obj, id) {
    super(id);
    this.obj = obj;
    this.angle = Math.PI / 4;
    this.textHelper = new TextHelper();
    this.pickA = [];
    this.pickB = [];
  }

  visitParams(callback) {
  }
  
  getReferencePoint() {
  }

  drag(x, y, dx, dy) {
    this.angle = Math.atan2(y - this.obj.c.y, x - this.obj.c.x)
  }

  translateImpl(dx, dy) {
  }
  
  drawImpl(ctx, scale, viewer) {
    if (this.obj == null) return;

    const marked = this.markers.length !== 0;

    if (marked) {
      ctx.save();
      viewer.setStyle(Styles.HIGHLIGHT, ctx);
    }

    const unscale = 1 /scale;
    const textOff = unscale * TEXT_H_OFFSET;

    const r = this.obj.distanceA ? this.obj.distanceA() : this.obj.r.get();

    let hxn = Math.cos(this.angle);
    let hyn = Math.sin(this.angle);

    //fix angle if needed
    if (isInstanceOf(this.obj, Arc) &&  !this.obj.isPointInsideSector(this.obj.c.x + hxn, this.obj.c.y + hyn)) {
      const cosA = hxn * (this.obj.a.x - this.obj.c.x) + hyn * (this.obj.a.y - this.obj.c.y);
      const cosB = hxn * (this.obj.b.x - this.obj.c.x) + hyn * (this.obj.b.y - this.obj.c.y);
      if (cosA - hxn > cosB - hxn) {
        this.angle = this.obj.getStartAngle();
      } else {
        this.angle = this.obj.getEndAngle();
      }
      hxn = Math.cos(this.angle);
      hyn = Math.sin(this.angle);
    }

    const _vxn = - hyn;
    const _vyn = hxn;

    const txt = 'R ' + r.toFixed(2);
    const _ax = this.obj.c.x;
    const _ay = this.obj.c.y;
    const _bx = this.obj.c.x + r * Math.cos(this.angle);
    const _by = this.obj.c.y + r * Math.sin(this.angle);

    ctx.beginPath();
    ctx.moveTo(_ax, _ay);
    ctx.lineTo(_bx, _by);

    ctx.stroke();

    const arrowWpx = ARROW_W_PX;
    const arrowW = arrowWpx * unscale;
    const arrowH = ARROW_H_PX * unscale;

    this.textHelper.prepare(txt, ctx, viewer);
    const takenByArrow = viewer.screenToModelDistance(arrowWpx + ARROW_TO_TEXT_PAD_PX);

    const availableArea = r - takenByArrow;

    const modelTextWidth = this.textHelper.modelTextWidth;

    const innerMode = modelTextWidth <= availableArea;

    let tx, ty;

    if (innerMode) {
      drawArrow(ctx, _bx, _by, -_vxn, -_vyn, arrowW, arrowH);

      this.pickA[0] = _ax; this.pickA[1] = _ay;
      this.pickB[0] = _bx; this.pickB[1] = _by;

      const h = r/2 - modelTextWidth/2 - arrowW/2;
      tx = (_ax + _vxn * textOff) - (- _vyn) * h;
      ty = (_ay + _vyn * textOff) - (  _vxn) * h;
    } else {
      drawArrow(ctx, _bx, _by, _vxn, _vyn, arrowW, arrowH);
      this.pickA[0] = _ax;
      this.pickB[0] = _bx;

      drawExtensionLine(ctx, _bx, _by, _vxn, _vyn,  modelTextWidth + 2 * OUTER_ARROW_TO_TEXT_PAD_PX * unscale, this.pickB, arrowW);

      tx = (_bx + _vxn * textOff) - (- _vyn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
      ty = (_by + _vyn * textOff) - (  _vxn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
    }

    this.textHelper.draw(tx, ty, _vxn, _vyn, ctx, unscale, viewer, textOff);

    if (marked) {
      ctx.restore();
    }
  }
  
  normalDistance(aim) {

    const textDist = this.textHelper.normalDistance(aim);

    if (textDist !== -1) {
      return textDist;
    }

    const [_ax, _ay]  = this.pickA;
    const [_bx, _by]  = this.pickB;

    const sdist = pointToLineSignedDistance(_ax, _ay, _bx, _by, aim.x, aim.y);
    if (sdist !== sdist) {
      return -1;
    }
    return Math.abs(sdist);

  }

  write() {
    return {
      obj: this.obj.id,
      angle: this.angle
    }
  }

  static load(id, data, index) {
    const dim = new DiameterDimension(
      index[data.obj],
      id
    );
    dim.angle = data.angle;
    return dim;
  }
}
DiameterDimension.prototype._class = 'TCAD.TWO.DiameterDimension';
DiameterDimension.prototype.TYPE = 'DiameterDimension';

export class AngleBetweenDimension extends Dimension {

  constructor(a, b, id) {
    super(id);
    this.a = a;
    this.b = b;
    this.offset = 20;
    this.textHelper = new TextHelper();
    this.configuration = [this.a.a, this.a.b, this.b.a, this.b.b];
    this.pickInfo = [];
  }

  visitParams(callback) {
  }

  drawImpl(ctx, scale, viewer) {
    const marked = this.markers.length !== 0;

    if (marked) {
      ctx.save();
      viewer.setStyle(Styles.HIGHLIGHT, ctx);
    }
    this.drawDimension(ctx, scale, viewer)

    if (marked) {
      ctx.restore();
    }
  }

  drawDimension(ctx, scale, viewer) {

    const unscale = viewer.unscale;
    let off = this.offset;
    const MIN_OFFSET_PX = 20;
    if (off * scale < MIN_OFFSET_PX) {
      off = MIN_OFFSET_PX * unscale;
    }
    const textOff = unscale * TEXT_H_OFFSET;

    let [aa, ab, ba, bb] = this.configuration;

    let aAng = makeAngle0_360(Math.atan2(ab.y - aa.y, ab.x - aa.x));
    let bAng = makeAngle0_360(Math.atan2(bb.y - ba.y, bb.x - ba.x));
    let ang = makeAngle0_360(bAng - aAng);
    if (ang > Math.PI && !this.isAnnotation) {
      this.configuration.reverse();
      [aa, ab, ba, bb] = this.configuration;
      aAng = makeAngle0_360(Math.atan2(ab.y - aa.y, ab.x - aa.x));
      bAng = makeAngle0_360(Math.atan2(bb.y - ba.y, bb.x - ba.x));
      ang = makeAngle0_360(bAng - aAng);
    }
    // this.a.syncGeometry();
    // this.b.syncGeometry && this.b.syncGeometry();

    const avx = Math.cos(aAng);
    const avy = Math.sin(aAng);
    const bvx = Math.cos(bAng);
    const bvy = Math.sin(bAng);


    this.center = findCenter(aa, ab, ba, bb, avx, avy, bvx, bvy);

    if (!this.center) {
      return;
    }

    const [cx, cy] = this.center;

    // if (distanceSquared(aa.x, aa.y, cx, cy) > distanceSquared(ab.x, ab.y, cx, cy)) {
    //   aAng = makeAngle0_360(aAng + Math.PI);
    //   avx *= -1;
    //   avy *= -1;
    // }
    // if (distanceSquared(ba.x, ba.y, cx, cy) > distanceSquared(bb.x, bb.y, cx, cy)) {
    //   bAng = makeAngle0_360(bAng + Math.PI);
    //   bvx *= -1;
    //   bvy *= -1;
    //
    // }
    const halfAng = 0.5 * ang;

    const _ax = cx + off * avx;
    const _ay = cy + off * avy;
    const _bx = cx + off * bvx;
    const _by = cy + off * bvy;


    const _vxn =  Math.cos(aAng + halfAng);
    const _vyn =  Math.sin(aAng + halfAng);

    const mx = cx + off * _vxn;
    const my = cy + off * _vyn;

    const arrowWpx = ARROW_W_PX;
    const arrowW = arrowWpx * unscale;
    const arrowH = ARROW_H_PX * unscale;

    const txt = (1 / DEG_RAD * ang).toFixed(2) + '°';

    this.textHelper.prepare(txt, ctx, viewer);

    let sinPhi =  arrowW / off;
    const cosPhi =  Math.sqrt(1 - sinPhi * sinPhi);

    if (cosPhi !== cosPhi) {
      return;
    }

    let arrLxV = avx * cosPhi - avy * sinPhi;
    let arrLyV = avx * sinPhi + avy * cosPhi;

    let arrLx = cx + off*(arrLxV);
    let arrLy = cy + off*(arrLyV);

    sinPhi *=  -1;

    let arrRxV = bvx * cosPhi - bvy * sinPhi;
    let arrRyV = bvx * sinPhi + bvy * cosPhi;

    let arrRx = cx + off*(arrRxV);
    let arrRy = cy + off*(arrRyV);


    const availableArea = distance(arrLx, arrLy, arrRx, arrRy);

    const modelTextWidth = this.textHelper.modelTextWidth;

    const innerMode = ang > Math.PI || modelTextWidth <= availableArea;

    let tx, ty;

    if (innerMode) {

      ctx.beginPath();
      ctx.arc(cx, cy, off, Math.atan2(arrLyV, arrLxV), Math.atan2(arrRyV, arrRxV));
      ctx.stroke();

      drawArrowForArc(ctx, arrLx, arrLy, _ax, _ay, -arrLxV, -arrLyV, arrowW, arrowH);
      drawArrowForArc(ctx, arrRx, arrRy, _bx, _by, arrRxV, arrRyV, arrowW, arrowH);

      const h = modelTextWidth/2;
      tx = (mx + _vxn * textOff) + (- _vyn) * h;
      ty = (my + _vyn * textOff) + (  _vxn) * h;
      this.textHelper.draw(tx, ty, _vxn, _vyn, ctx, unscale, viewer, textOff, true);

    } else {

      ctx.beginPath();
      ctx.arc(cx, cy, off, aAng, bAng);
      ctx.stroke();

      //sin is inverted by this time

      arrLxV = avx * cosPhi - avy * sinPhi;
      arrLyV = avx * sinPhi + avy * cosPhi;

      arrLx = cx + off*(arrLxV);
      arrLy = cy + off*(arrLyV);

      sinPhi *=  -1;

      arrRxV = bvx * cosPhi - bvy * sinPhi;
      arrRyV = bvx * sinPhi + bvy * cosPhi;

      arrRx = cx + off*(arrRxV);
      arrRy = cy + off*(arrRyV);

      drawArrowForArc(ctx, arrLx, arrLy, _ax, _ay, -arrLxV, -arrLyV, arrowW, arrowH);
      drawArrowForArc(ctx, arrRx, arrRy, _bx, _by, arrRxV, arrRyV, arrowW, arrowH);

      const longExt = modelTextWidth + 2 * OUTER_ARROW_TO_TEXT_PAD_PX * unscale;
      const shortExt = OUTER_ARROW_TO_TEXT_PAD_PX * unscale;

      ctx.beginPath();
      ctx.moveTo(arrLx, arrLy);
      ctx.lineTo(arrLx + arrLyV * shortExt, arrLy - arrLxV  * shortExt);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(arrRx, arrRy);
      ctx.lineTo(arrRx - arrRyV * longExt, arrRy + arrRxV * longExt);
      ctx.stroke();


      tx = arrRx + ( -arrRyV) * OUTER_ARROW_TO_TEXT_PAD_PX * unscale - arrRxV * textOff;
      ty = arrRy + (  arrRxV) * OUTER_ARROW_TO_TEXT_PAD_PX * unscale - arrRyV * textOff;

      this.textHelper.draw(tx, ty, -arrRxV, -arrRyV, ctx, unscale, viewer, textOff, false);
    }

    this.setPickInfo(cx, cy, _ax, _ay, _bx, _by, off);

    this.drawRef(ctx, aa, ab, _ax, _ay, avx, avy, viewer, unscale, true);
    this.drawRef(ctx, ba, bb, _bx, _by, bvx, bvy, viewer, unscale, false);
  }

  drawRef(ctx, a, b, px, py, vx, vy, viewer, unscale, first) {

    const abx = b.x - a.x;
    const aby = b.y - a.y;

    const apx = px - a.x;
    const apy = py - a.y;

    const dot = abx * apx + aby * apy;

    if (dot < 0) {
      ctx.save();
      viewer.setStyle(Styles.CONSTRUCTION, ctx);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(px - vx * EXT_ANGULAR_WIDTH_PX * unscale, py - vy * EXT_ANGULAR_WIDTH_PX * unscale);
      ctx.stroke();
      ctx.restore();
    } else if (apx * apx + apy * apy > abx * abx + aby * aby) {
      ctx.save();
      viewer.setStyle(Styles.CONSTRUCTION, ctx);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(px + vx * EXT_ANGULAR_WIDTH_PX * unscale, py + vy * EXT_ANGULAR_WIDTH_PX * unscale);
      ctx.stroke();
      ctx.restore();
    }
  }

  setPickInfo(cx, cy, ax, ay, bx, by, rad) {
    for (let i = 0; i < arguments.length; ++i) {
      this.pickInfo[i] = arguments[i];
    }
  }

  normalDistance(aim, scale) {

    const textDist = this.textHelper.normalDistance(aim);

    if (textDist !== -1) {
      return textDist;
    }

    if (this.pickInfo.length === 0) {
      return;
    }

    const [cx, cy, ax, ay, bx, by, rad] = this.pickInfo;

    function isPointInsideSector(x, y) {
      const ca = [ax - cx, ay - cy];
      const cb = [bx - cx, by - cy];
      const ct = [x - cx, y - cy];

      vec._normalize(ca);
      vec._normalize(cb);
      vec._normalize(ct);
      const cosAB = vec.dot(ca, cb);
      const cosAT = vec.dot(ca, ct);

      const isInside = cosAT >= cosAB;
      const abInverse = vec.cross2d(ca, cb) < 0;
      const atInverse = vec.cross2d(ca, ct) < 0;

      let result;
      if (abInverse) {
        result = !atInverse || !isInside;
      } else {
        result = !atInverse && isInside;
      }
      return result;
    }

    const isInsideSector = isPointInsideSector(aim.x, aim.y);
    if (isInsideSector) {
      return Math.abs(distance(aim.x, aim.y, cx, cy) - rad);
    } else {
      return Math.min(
        distance(aim.x, aim.y, ax, ay),
        distance(aim.x, aim.y, bx, by)
      );
    }
  }

  write() {
    return {
      a: this.a.id,
      b: this.b.id,
      offset: this.offset,
      configuration: this.configuration.map(o => o.id)
    }
  }

  static load(id, data, index) {
    const dim = new AngleBetweenDimension(
      index[data.a],
      index[data.b],
      id
    );
    dim.offset = data.offset;
    dim.configuration = data.configuration.map(id => index[id]);
    return dim;
  }
}

export function findCenter(aa, ab, ba, bb, avx, avy, bvx, bvy) {
  let center = lineLineIntersection2d([aa.x, aa.y], [ba.x, ba.y], [avx, avy], [bvx, bvy]);

  if (!center) {
    let commonPt = null;
    aa.visitLinked(p => {
      if (ba === p || bb === p) {
        commonPt = aa;
      }
    });
    if (!commonPt) {
      ab.visitLinked(p => {
        if (ba === p || bb === p) {
          commonPt = ab;
        }
      });

    }
    if (!commonPt) {
      return null;
    }
    center = commonPt.toVectorArray();
  }
  return center;
}

AngleBetweenDimension.prototype._class = 'TCAD.TWO.AngleBetweenDimension';
AngleBetweenDimension.prototype.TYPE = 'AngleBetweenDimension';


