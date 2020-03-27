import * as math from '../../math/math'
import {pointToLineSignedDistance} from '../../math/math'
import Vector from 'math/vector';
import {SketchObject} from './sketch-object'
import {Styles} from "../styles";
import {TextHelper} from "./textHelper";
import {isInstanceOf} from "../actions/matchUtils";
import {Arc} from "./arc";

const ARROW_W_PX = 15;
const ARROW_H_PX = 4;
const ARROW_TO_TEXT_PAD_PX = 2;
const TEXT_H_OFFSET = 3;
const OUTER_ARROW_TO_TEXT_PAD_PX = 6;

function drawArrow(ctx, x, y, nx, ny, arrowW, arrowH) {
  ctx.beginPath();
  ctx.moveTo(x, y, 0);
  ctx.lineTo(x + ny * arrowW + nx * arrowH, y + -nx * arrowW + ny * arrowH );
  ctx.lineTo(x + ny * arrowW - nx * arrowH, y + -nx * arrowW - ny * arrowH);
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

class LinearDimension extends SketchObject {
  
  constructor(a, b) {
    super();
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

    let _vx = - (_by - _ay);
    let _vy = _bx - _ax;

    const d = math.distance(_ax, _ay, _bx, _by);

    //normalize
    let _vxn = _vx / d;
    let _vyn = _vy / d;

    this.offset += (dx *  _vxn + dy * _vyn) * this.unscale;
  }
  
  getA() { return this.a }
  getB() { return this.b }
  
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

    let a, b, startA, startB;
    a = this.getB();
    b = this.getA();
    startA = this.b;
    startB = this.a;

    const d = math.distanceAB(a, b);

    let _vx = - (b.y - a.y);
    let _vy = b.x - a.x;
  
    //normalize
    let _vxn = _vx / d;
    let _vyn = _vy / d;
  
    _vx = _vxn * off;
    _vy = _vyn * off;
  
    ctx.beginPath();

    let _ax = a.x + _vx;
    let _ay = a.y + _vy;
    let _bx = b.x + _vx;
    let _by = b.y + _vy;
  
    ctx.moveTo(_ax, _ay);
    ctx.lineTo(_bx, _by);
  
  
    function drawRef(start, x, y) {
      var vec = new Vector(x - start.x, y - start.y);
      vec._normalize();
      vec._multiply(7 * unscale);
      
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
}





export class Dimension extends LinearDimension {
  constructor(a, b) {
    super(a, b);
  }
}
Dimension.prototype._class = 'TCAD.TWO.Dimension';


export class HDimension extends LinearDimension {
  constructor(a, b) {
    super(a, b);
  }

  getA() {
    return this.a;
  }
  
  getB() {
    return {x: this.b.x, y: this.a.y};
  }
}
HDimension.prototype._class = 'TCAD.TWO.HDimension';

export class VDimension extends LinearDimension {
  
  constructor(a, b) {
    super(a, b);
  }

  getA() {
    return this.a;
  }

  getB() {
    return {x: this.a.x, y: this.b.y};
  }
}
VDimension.prototype._class = 'TCAD.TWO.VDimension';


export class DiameterDimension extends SketchObject {
  
  constructor(obj) {
    super();
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

    let r = this.obj.distanceA ? this.obj.distanceA() : this.obj.r.get();

    let hxn = Math.cos(this.angle);
    let hyn = Math.sin(this.angle);

    //fix angle if needed
    if (isInstanceOf(this.obj, Arc) &&  !this.obj.isPointInsideSector(this.obj.c.x + hxn, this.obj.c.y + hyn)) {
      let cosA = hxn * (this.obj.a.x - this.obj.c.x) + hyn * (this.obj.a.y - this.obj.c.y);
      let cosB = hxn * (this.obj.b.x - this.obj.c.x) + hyn * (this.obj.b.y - this.obj.c.y);
      if (cosA - hxn > cosB - hxn) {
        this.angle = this.obj.getStartAngle();
      } else {
        this.angle = this.obj.getEndAngle();
      }
      hxn = Math.cos(this.angle);
      hyn = Math.sin(this.angle);
    }

    let _vxn = - hyn;
    let _vyn = hxn;

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

}
DiameterDimension.prototype._class = 'TCAD.TWO.DiameterDimension';


function getTextOff(scale) {
  return 3 * scale;
}


