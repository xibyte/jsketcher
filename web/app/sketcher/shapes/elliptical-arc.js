import {Ellipse} from './ellipse'
import {swap} from '../../utils/utils'
import {EndPoint} from "./point";
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {distance} from "math/distance";
import {areEqual, TOLERANCE} from "math/equality";
import Vector from "math/vector";

export class EllipticalArc extends Ellipse {

  constructor(cx, cy, rx, ry, rot, ax, ay, bx, by, id) {
    super(cx, cy, rx, ry, rot, id);
    this.a = new EndPoint(ax, ay, this.id + ':A');
    this.b = new EndPoint(bx, by, this.id + ':B');
    this.addChild(this.a);
    this.addChild(this.b);
    
    //we'd like to have angles points have higher selection order 
    swap(this.children, 0, this.children.length - 2);
    swap(this.children, 1, this.children.length - 1);
  }

  stabilize(viewer) {
    const c1 = new AlgNumConstraint(ConstraintDefinitions.PointOnEllipse, [this.b, this]);
    c1.internal = true;

    const c2 = new AlgNumConstraint(ConstraintDefinitions.PointOnEllipse, [this.a, this]);
    c2.internal = true;

    this.stage.addConstraint(c1);
    this.stage.addConstraint(c2);
  }

  drawImpl(ctx, scale) {
    ctx.beginPath();
    const radiusX = Math.max(this.radiusX, 1e-8);
    const radiusY = Math.max(this.radiusY, 1e-8);
    const aAngle = this.drawAngle(this.a);
    let bAngle;
    if (areEqual(this.a.x, this.b.x, TOLERANCE) &&
      areEqual(this.a.y, this.b.y, TOLERANCE)) {
      bAngle = aAngle + 2 * Math.PI;
    } else {
      bAngle = this.drawAngle(this.b)
    }
    ctx.ellipse(this.centerX, this.centerY, radiusX, radiusY, this.rotation, aAngle, bAngle );
    ctx.stroke();
  }
  
  drawAngle(point) {
    const deformScale =  this.radiusY / this.radiusX;
    const x = point.x - this.centerX;
    const y = point.y - this.centerY;
    const rotation =  - this.rotation;
    let xx =  x * Math.cos(rotation) - y * Math.sin(rotation);
    const yy =  x * Math.sin(rotation) + y * Math.cos(rotation);
    xx *= deformScale;
    return Math.atan2(yy, xx);
  }

  get labelCenter() {
    return new Vector(this.c.x, this.c.y, 0);
  }

  write() {
    return {
      c: this.c.write(),
      rx: this.rx.get(),
      ry: this.ry.get(),
      rot: this.rot.get(),
      a: this.a.write(),
      b: this.b.write()
    };
  }

  static read(id, data) {
    if (data.ep1) {
      return readFormatV1(id, data);
    }
    return new EllipticalArc(
      data.c.x,
      data.c.y,
      data.rx,
      data.ry,
      data.rot,
      data.a.x, data.a.y, data.b.x, data.b.y,
      id
    )
  }
}

function readFormatV1(id, data) {

  const cx = data.ep1.x + (data.ep2.x - data.ep1.x) * 0.5;
  const cy = data.ep1.y + (data.ep2.y - data.ep1.y) * 0.5;
  const rx = distance(data.ep1.x, data.ep1.y, data.ep2.x, data.ep2.y) * 0.5;
  const ry = data.r;
  const rot = Math.atan2(data.ep2.y - data.ep1.y, data.ep2.x - data.ep1.x);

  return new EllipticalArc(cx, cy, rx, ry, rot, data.a.x, data.a.y, data.b.x, data.b.y, id);
}

EllipticalArc.prototype._class = 'TCAD.TWO.EllipticalArc';
EllipticalArc.prototype.TYPE = 'EllipticalArc';
