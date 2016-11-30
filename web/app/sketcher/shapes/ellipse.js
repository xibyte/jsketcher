import {Ref} from './ref'
import {SketchObject} from './sketch-object'

import * as math from '../../math/math';

export class Ellipse extends SketchObject {

  constructor(ep1, ep2) {
    super();
    this.ep1 = ep1;
    this.ep2 = ep2;
    this.addChild(this.ep1);
    this.addChild(this.ep2);
    this.r = new Ref(0);
    this.r.value = this.radiusX * 0.5;
    this.r.obj = this;
  }

  get rotation() {
    return Math.atan2(this.ep2.y - this.ep1.y, this.ep2.x - this.ep1.x);
  }

  get radiusX() {
    return math.distance(this.ep1.x, this.ep1.y, this.ep2.x, this.ep2.y) * 0.5;
  }

  get radiusY() {
    return this.r.get();
  }

  get centerX() {
    return this.ep1.x + (this.ep2.x - this.ep1.x) * 0.5; 
  }

  get centerY() {
    return this.ep1.y + (this.ep2.y - this.ep1.y) * 0.5;
  }

  drawImpl(ctx, scale) {
    ctx.beginPath();
    ctx.ellipse(this.centerX, this.centerY, this.radiusX, this.radiusY, this.rotation, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  toEllipseCoordinateSystem(point) {
    let x = point.x - this.centerX;
    let y = point.y - this.centerY;
    const angle = Math.atan2(y, x) - this.rotation;
    const distance = math.distance(0, 0, x, y);
    x = distance * Math.cos(angle);
    y = distance * Math.sin(angle);
    return {x, y, angle, distance};
  }
  
  normalDistance(aim) {
    const trInfo = this.toEllipseCoordinateSystem(aim);
    const sq = (a) => a * a;
    const L = Math.sqrt(1/( sq(Math.sin(trInfo.angle)/this.radiusX) + sq(Math.cos(trInfo.angle)/this.radiusY)));
    return Math.abs(trInfo.distance - L);
  }
}
Ellipse.prototype._class = 'TCAD.TWO.Ellipse';
