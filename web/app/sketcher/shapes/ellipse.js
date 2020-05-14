import {SketchObject} from './sketch-object'

import * as math from '../../math/math';
import {Param} from "./param";
import {SketchSegmentSerializationData} from "./segment";
import {EndPoint} from "./point";

export class Ellipse extends SketchObject {

  constructor(x1, y1, x2, y2, r, id) {
    super(id);
    this.ep1 = new EndPoint(x1, y1, this.id + ':1');
    this.ep2 = new EndPoint(x2, y2, this.id + ':2');
    this.addChild(this.ep1);
    this.addChild(this.ep2);
    this.r = new Param(r === undefined ? 0 : this.radiusX * 0.5, 'R');
    this.r.enforceVisualLimit = true;
  }

  recoverIfNecessary() {
    let recovered = false;
    if (math.distanceAB(this.ep1, this.ep2) <= math.TOLERANCE) {
      this.ep1.translate(-RECOVER_LENGTH, -RECOVER_LENGTH);
      this.ep2.translate(RECOVER_LENGTH, RECOVER_LENGTH);
      recovered = true;
    }
    if (this.radiusY <= 0.1) {
      this.r.set(RECOVER_LENGTH);
      recovered = true;
    }
    return recovered;
  }

  visitParams(callback) {
    this.ep1.visitParams(callback);
    this.ep2.visitParams(callback);
    callback(this.r);
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
    const radiusX = Math.max(this.radiusX, 1e-8);
    const radiusY = Math.max(this.radiusY, 1e-8);
    ctx.ellipse(this.centerX, this.centerY, radiusX, radiusY, this.rotation, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  toEllipseCoordinateSystem(point) {
    let x = point.x - this.centerX;
    let y = point.y - this.centerY;
    const angle = Math.atan2(y, x) - this.rotation;
    const radius = math.distance(0, 0, x, y);
    x = radius * Math.cos(angle);
    y = radius * Math.sin(angle);
    return {x, y, angle, radius};
  }

  radiusAtAngle(angle) {
    return Math.sqrt(1/( sq(Math.cos(angle)/this.radiusX) + sq(Math.sin(angle)/this.radiusY)));
  }

  normalDistance(aim) {
    const polarPoint = this.toEllipseCoordinateSystem(aim);
    const L = this.radiusAtAngle(polarPoint.angle);
    return Math.abs(polarPoint.radius - L);
  }
  
  static findMinorRadius(majorRadius, pntRadius, pntAngle) {
    return Math.abs( Math.sin(pntAngle) /  Math.sqrt(1 / sq(pntRadius) - sq(Math.cos(pntAngle) / majorRadius)) );
  }

  write() {
    return {
      ep1: this.ep1.write(),
      ep2: this.ep2.write(),
      r: this.r.get()
    };
  }

  static read(id, data) {
    return new Ellipse(
      data.ep1.x,
      data.ep1.y,
      data.ep2.x,
      data.ep2.y,
      data.r,
      id
    )
  }

}
Ellipse.prototype._class = 'TCAD.TWO.Ellipse';
Ellipse.prototype.TYPE = 'Ellipse';

const sq = (a) => a * a;
const RECOVER_LENGTH = 100;