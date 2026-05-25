import {AngleBetweenDimension, DiameterDimension, LinearDimension} from "../dim";
import {Styles} from "../../styles";
import {ConstraintAnnotation} from "../../constr/constraintAnnotation";
import {AlgNumConstraint} from "../../constr/ANConstraints";
import {Segment} from "../segment";
import {Arc} from "../arc";
import {Viewer} from "../../viewer2d";

export class AngleBetweenAnnotation extends AngleBetweenDimension implements ConstraintAnnotation<{offset: number}> {

  constraint: AlgNumConstraint;

  isConstraintAnnotation = true;

  constructor(a: Segment, b: Segment, constraint: AlgNumConstraint) {
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

  load(params: { offset: number }) {
    this.offset = params.offset;
  }
}

AngleBetweenAnnotation.prototype.TYPE = 'AngleBetweenAnnotation';

AngleBetweenAnnotation.prototype._class = 'TCAD.TWO.AngleBetweenAnnotation';

export class AngleAbsoluteAnnotation extends AngleBetweenDimension implements ConstraintAnnotation<{offset: number}> {

  constraint: AlgNumConstraint;

  isConstraintAnnotation = true;

  constructor(segment: Segment, constraint: AlgNumConstraint) {
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

  drawRef(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, px: number, py: number, vx: number, vy: number, viewer: Viewer, unscale: number, first: boolean) {
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

  load(params: { offset: number }) {
    this.offset = params.offset;
  }
}

AngleAbsoluteAnnotation.prototype._class = 'AngleAbsoluteAnnotation';


export class LengthAnnotation extends LinearDimension implements ConstraintAnnotation<{offset: number}>  {

  constraint: AlgNumConstraint;

  isConstraintAnnotation = true;

  constructor(segment: Segment, constraint: AlgNumConstraint) {
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

  load(params: { offset: number }) {
    this.offset = params.offset;
  }
}

LengthAnnotation.prototype.TYPE = 'LengthAnnotation';

LengthAnnotation.prototype._class = 'TCAD.TWO.LengthAnnotation';

export class RadiusLengthAnnotation extends DiameterDimension implements ConstraintAnnotation<{angle: number}>  {

  constraint: AlgNumConstraint;

  isConstraintAnnotation = true;

  constructor(obj: Arc, constraint: AlgNumConstraint) {
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

  load(params: { angle: number }) {
    this.angle = params.angle;
  }
}

RadiusLengthAnnotation.prototype.TYPE = 'RadiusLengthAnnotation';

RadiusLengthAnnotation.prototype._class = 'TCAD.TWO.RadiusLengthAnnotation';
