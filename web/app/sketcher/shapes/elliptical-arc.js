import {Ellipse} from './ellipse'
import {Constraints} from '../parametric'

import * as math from '../../math/math';
import {swap} from '../../utils/utils'

export class EllipticalArc extends Ellipse {

  constructor(ep1, ep2, a, b) {
    super(ep1, ep2);
    this.a = a;
    this.b = b;
    this.addChild(a);
    this.addChild(b);
    
    //we'd like to have angles points have higher selection order 
    swap(this.children, 0, this.children.length - 2);
    swap(this.children, 1, this.children.length - 1);
  }

  stabilize(viewer) {
    this.stage.addConstraint(new Constraints.PointOnEllipseInternal(this.b, this));
    this.stage.addConstraint(new Constraints.PointOnEllipseInternal(this.a, this));
  }

  drawImpl(ctx, scale) {
    ctx.beginPath();
    const radiusX = Math.max(this.radiusX, 1e-8);
    const radiusY = Math.max(this.radiusY, 1e-8);
    let aAngle = this.drawAngle(this.a);
    let bAngle;
    if (math.areEqual(this.a.x, this.b.x, math.TOLERANCE) &&
      math.areEqual(this.a.y, this.b.y, math.TOLERANCE)) {
      bAngle = aAngle + 2 * Math.PI;
    } else {
      bAngle = this.drawAngle(this.b)
    }
    ctx.ellipse(this.centerX, this.centerY, radiusX, radiusY, this.rotation, aAngle, bAngle );
    ctx.stroke();
  }
  
  drawAngle(point) {
    let deformScale =  this.radiusY / this.radiusX;
    let x = point.x - this.centerX;
    let y = point.y - this.centerY;
    const rotation =  - this.rotation;
    let xx =  x * Math.cos(rotation) - y * Math.sin(rotation);
    let yy =  x * Math.sin(rotation) + y * Math.cos(rotation);
    xx *= deformScale;
    return Math.atan2(yy, xx);
  }
}

EllipticalArc.prototype._class = 'TCAD.TWO.EllipticalArc';
EllipticalArc.prototype.TYPE = 'ELLIPTICAL_ARC';
