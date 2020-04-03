import {AngleBetweenDimension, DiameterDimension, Dimension} from "../dim";
import {Styles} from "../../styles";

export class AngleBetweenAnnotation extends AngleBetweenDimension {

  constructor(a, b, constraint) {
    super(a, b);
    this.constraint = constraint;
  }

  get isAnnotation() {
    return true;
  }

  save() {
    return {
      offset: this.offset,
    }
  }

  load(params) {
    this.offset = params.offset;
  }
}

AngleBetweenAnnotation.prototype._class = 'TCAD.TWO.AngleBetweenAnnotation';

export class AngleAbsoluteAnnotation extends AngleBetweenDimension {

  constructor(segment, constraint) {
    super({
      a: segment.a,
      b: {
        get x() {
          return segment.a.x + 100
        },
        get y() {
          return segment.a.y;
        }
      },
      params: {
        ang: {
          get() {
            return 0
          }
        }
      },
      get nx() {
        return 0;
      },
      get ny() {
        return 1;
      }
    }, segment);
    this.constraint = constraint;
  }

  get isAnnotation() {
    return true;
  }

  drawRef(ctx, a, b, px, py, vx, vy, viewer, unscale, first) {
    if (!first) {
      super.drawRef(ctx, a, b, px, py, vx, vy, viewer, unscale, first);
    } else {
      const WIDTH = 10;
      ctx.save();
      viewer.setStyle(Styles.CONSTRUCTION, ctx);
      ctx.beginPath();
      ctx.lineTo(px + vx * WIDTH * unscale, py + vy * WIDTH * unscale);
      ctx.lineTo(px - vx * WIDTH * unscale, py - vy * WIDTH * unscale);
      ctx.stroke();
      ctx.restore();
    }
  }

  save() {
    return {
      offset: this.offset,
    }
  }

  load(params) {
    this.offset = params.offset;
  }
}

AngleAbsoluteAnnotation.prototype._class = 'TCAD.TWO.AngleAbsoluteAnnotation';


export class LengthAnnotation extends Dimension {

  constructor(segment, constraint) {
    super(segment.a, segment.b);
    this.constraint = constraint;
  }

  get isAnnotation() {
    return true;
  }

  save() {
    return {
      offset: this.offset,
    }
  }

  load(params) {
    this.offset = params.offset;
  }
}

LengthAnnotation.prototype._class = 'TCAD.TWO.LengthAnnotation';

export class RadiusLengthAnnotation extends DiameterDimension {

  constructor(obj, constraint) {
    super(obj);
    this.constraint = constraint;
  }

  get isAnnotation() {
    return true;
  }

  save() {
    return {
      angle: this.angle,
    }
  }

  load(params) {
    this.angle = params.angle;
  }
}

RadiusLengthAnnotation.prototype._class = 'TCAD.TWO.RadiusLengthAnnotation';
