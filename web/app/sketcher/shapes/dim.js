import * as math from '../../math/math'
import Vector from 'math/vector';
import {SketchObject} from './sketch-object'
import {Styles} from "../styles";
import {_90} from "../../math/math";
import {_270} from "../../math/math";
import {makeAngle0_360} from "../../math/math";

class LinearDimension extends SketchObject {
  
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
    this.flip = false;
    this.offset = 15;
    this.pickA = [];
    this.pickB = [];
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

    const dimScale = viewer.dimScale;

    const unscale = 1 /scale;
    const off = unscale * this.offset;
    const textOff = unscale * 3; // getTextOff(dimScale);

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
  
    ctx.closePath();
    ctx.stroke();

    const arrowWpx = 15;
    const arrowW = arrowWpx * unscale;
    const arrowH = 4 * unscale;

    function drawArrow(x, y, nx, ny) {
      ctx.beginPath();
      ctx.moveTo(x, y, 0);
      ctx.lineTo(x + ny * arrowW + nx * arrowH, y + -nx * arrowW + ny * arrowH );
      ctx.lineTo(x + ny * arrowW - nx * arrowH, y + -nx * arrowW - ny * arrowH);
      ctx.closePath();
      ctx.fill();
    }

    function drawExtensionLine(x, y, nx, ny, width, tip) {
      ctx.beginPath();
      ctx.moveTo(x + ny * arrowW, y + -nx * arrowW);

      tip[0] = x + ny * (arrowW + width);
      tip[1] = y + -nx * (arrowW + width);

      ctx.lineTo(tip[0], tip[1]);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.font = (12) + "px Arial";
    const txt = d.toFixed(2);
    const textMetrics = ctx.measureText(txt);

    const arrowToTextPaddingPx = 2;
    const takenByArrow = viewer.screenToModelDistance(2 * (arrowWpx + arrowToTextPaddingPx));

    const availableArea = d - takenByArrow;

    const modelTextWidth = viewer.screenToModelDistance(textMetrics.width);

    const innerMode = modelTextWidth <= availableArea;

    let rot = makeAngle0_360(Math.atan2(-_vxn, _vyn));
    const flip = rot > _90 && rot < _270;
    if (flip) {
      rot += Math.PI;
    }
    let tx, ty;

    if (innerMode) {
      drawArrow(_ax, _ay, _vxn, _vyn);
      drawArrow(_bx, _by, -_vxn, -_vyn);

      this.pickA[0] = _ax; this.pickA[1] = _ay;
      this.pickB[0] = _bx; this.pickB[1] = _by;

      const h = d/2 - modelTextWidth/2;
      tx = (_ax + _vxn * textOff) - (- _vyn) * h;
      ty = (_ay + _vyn * textOff) - (  _vxn) * h;
    } else {
      drawArrow(_ax, _ay, -_vxn, -_vyn);
      drawArrow(_bx, _by, _vxn, _vyn);
      const outerArrowToTextPaddingPx = 6;

      drawExtensionLine(_ax, _ay, -_vxn, -_vyn,  outerArrowToTextPaddingPx * unscale, this.pickA);
      drawExtensionLine(_bx, _by, _vxn, _vyn,  modelTextWidth + 2 * outerArrowToTextPaddingPx * unscale, this.pickB);

      tx = (_bx + _vxn * textOff) - (- _vyn) * (arrowWpx + outerArrowToTextPaddingPx) * unscale;
      ty = (_by + _vyn * textOff) - (  _vxn) * (arrowWpx + outerArrowToTextPaddingPx) * unscale;
    }

    ctx.save();
    ctx.translate(tx, ty);
    if (flip) {
      ctx.translate(_vyn * modelTextWidth - _vxn * 2 *textOff,  -_vxn * modelTextWidth - _vyn * 2*textOff);
    }

    ctx.rotate(rot);
    ctx.scale(unscale, -unscale);
    ctx.fillText(txt, 0, 0);
    ctx.restore();

    if (marked) {
      ctx.restore();
    }

  }
  
  normalDistance(aim, scale) {

    const [_ax, _ay]  = this.pickA;
    const [_bx, _by]  = this.pickB;

    let _vx = - (_by - _ay);
    let _vy = _bx - _ax;

    const d = math.distance(_ax, _ay, _bx, _by);

    //normalize
    let _vxn = _vx / d;
    let _vyn = _vy / d;

    let avx = aim.x - _ax;
    let avy = aim.y - _ay;

    const proj = avx *  _vyn + avy * (-_vxn);

    //Check if vector b lays on the vector ab
    if (proj > d) {
      return -1;
    }

    if (proj < 0) {
      return -1;
    }

    return Math.abs(avx *  _vxn + avy * _vyn);
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
  }

  visitParams(callback) {
  }
  
  getReferencePoint() {
  }
  
  translateImpl(dx, dy) {
  }
  
  drawImpl(ctx, scale, viewer) {
    if (this.obj == null) return;
    if (this.obj._class === 'TCAD.TWO.Circle') {
      this.drawForCircle(ctx, scale, viewer);  
    } else if (this.obj._class === 'TCAD.TWO.Arc') { 
      this.drawForArc(ctx, scale, viewer);
    }
  }
  
  drawForCircle(ctx, scale, viewer) {
    var c = new Vector().setV(this.obj.c);
    var r = this.obj.r.get();
    var angled = new Vector(r * Math.cos(this.angle), r * Math.sin(this.angle), 0);
    var a = c.minus(angled);
    var b = c.plus(angled);
    var textOff = getTextOff(viewer.dimScale);
  
    var d = 2 * r;
  
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.stroke();
  
    var fontSize = 12 * viewer.dimScale;
    ctx.font = (fontSize) + "px Arial";
    var txt = String.fromCharCode(216) + ' ' + d.toFixed(2);
    var textWidth = ctx.measureText(txt).width;
    var h = d / 2 - textWidth / 2; 
    
    var _vx = - (b.y - a.y);
    var _vy = b.x - a.x;
  
    //normalize
    var _vxn = _vx / d;
    var _vyn = _vy / d;
  
    function drawText(tx, ty) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-Math.atan2(_vxn, _vyn));
      ctx.scale(1, -1);
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
    
    var tx, ty; 
    if (h - fontSize * .3 > 0) { // take into account font size to not have circle overlap symbols
      tx = (a.x + _vxn * textOff) - (-_vyn) * h;
      ty = (a.y + _vyn * textOff) - (  _vxn) * h;
      drawText(tx, ty);
    } else {
      var off = 2 * viewer.dimScale;
      angled._normalize();
      var extraLine = angled.multiply(textWidth + off * 2);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + extraLine.x, b.y + extraLine.y);
      ctx.closePath();
      ctx.stroke();
      angled._multiply(off);
      
      tx = (b.x + _vxn * textOff) + angled.x;
      ty = (b.y + _vyn * textOff) + angled.y;
      drawText(tx, ty);
    }
  }
  
  drawForArc(ctx, scale, viewer) {
  
    var r = this.obj.distanceA();
  
    var hxn = Math.cos(this.angle);
    var hyn = Math.sin(this.angle);
  
    var vxn = - hyn;
    var vyn = hxn;
  
    //fix angle if needed
    if (!this.obj.isPointInsideSector(this.obj.c.x + hxn, this.obj.c.y + hyn)) {
      var cosA = hxn * (this.obj.a.x - this.obj.c.x) + hyn * (this.obj.a.y - this.obj.c.y);
      var cosB = hxn * (this.obj.b.x - this.obj.c.x) + hyn * (this.obj.b.y - this.obj.c.y);
      if (cosA - hxn > cosB - hxn) {
        this.angle = this.obj.getStartAngle();
      } else {
        this.angle = this.obj.getEndAngle();
      }
    }
  
    var vertOff = getTextOff(viewer.dimScale);
    var horOff = 5 * viewer.dimScale;
  
    var fontSize = 12 * viewer.dimScale;
    ctx.font = (fontSize) + "px Arial";
    var txt = 'R ' + r.toFixed(2);
    var textWidth = ctx.measureText(txt).width;
  
    var startX = this.obj.c.x + hxn * r;
    var startY = this.obj.c.y + hyn * r;
    var lineLength = textWidth + horOff * 2;
  
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + hxn * lineLength, startY + hyn * lineLength);
    ctx.closePath();
    ctx.stroke();
  
    var tx = startX + vxn * vertOff + hxn * horOff;
    var ty = startY + vyn * vertOff + hyn * horOff;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-Math.atan2(vxn, vyn));
    ctx.scale(1, -1);
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  
  normalDistance(aim) {
    return -1;
  }
}
DiameterDimension.prototype._class = 'TCAD.TWO.DiameterDimension';


function getTextOff(scale) {
  return 3 * scale;
}


