import {SketchObject} from './sketch-object'
import {Param} from "./param";
import {EndPoint} from "./point";
import {distance} from "math/distance";

export class Ellipse extends SketchObject {

  constructor(cx, cy, rx, ry, rot, id) {
    super(id);

    this.c = new EndPoint(cx, cy, this.id + ':C');

    this.addChild(this.c);

    this.rot = new Param(rot, 'A');
    this.rx = new Param(rx, 'Rx');
    this.ry = new Param(ry, 'Rx');

    this.rx.enforceVisualLimit = true;
    this.ry.enforceVisualLimit = true;
  }

  recoverIfNecessary() {
    let recovered = false;
    if (this.radiusX <= 0.1) {
      this.rx.set(RECOVER_LENGTH);
      recovered = true;
    }
    if (this.radiusY <= 0.1) {
      this.ry.set(RECOVER_LENGTH);
      recovered = true;
    }
    return recovered;
  }

  visitParams(callback) {
    this.c.visitParams(callback);
    callback(this.rx);
    callback(this.ry);
    callback(this.rot);
  }


  get rotation() {
    return this.rot.get();
  }

  get radiusX() {
    return this.rx.get();
  }

  get radiusY() {
    return this.ry.get();
  }

  get centerX() {
    return this.c.x;
  }

  get centerY() {
    return this.c.y;
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
    const radius = distance(0, 0, x, y);
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
      c: this.c.write(),
      rx: this.rx.get(),
      ry: this.ry.get(),
      rot: this.rot.get(),
    };
  }

  static read(id, data) {
    if (data.ep1) {
      return readFormatV1(id, data);
    }
    return new Ellipse(
      data.c.x,
      data.c.y,
      data.rx,
      data.ry,
      data.rot,
      id
    )
  }

}
Ellipse.prototype._class = 'TCAD.TWO.Ellipse';
Ellipse.prototype.TYPE = 'Ellipse';

const sq = (a) => a * a;
const RECOVER_LENGTH = 100;

function readFormatV1(id, data) {

  const cx = data.ep1.x + (data.ep2.x - data.ep1.x) * 0.5;
  const cy = data.ep1.y + (data.ep2.y - data.ep1.y) * 0.5;
  const rx = distance(data.ep1.x, data.ep1.y, data.ep2.x, data.ep2.y) * 0.5;
  const ry = data.r;
  const rot = Math.atan2(data.ep2.y - data.ep1.y, data.ep2.x - data.ep1.x);

  return new Ellipse(cx, cy, rx, ry, rot, id);
}