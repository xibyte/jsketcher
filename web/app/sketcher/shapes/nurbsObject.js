import {SketchObject} from './sketch-object'
import * as vec from 'math/vec';
import {curveTessellate} from 'geom/impl/nurbs-ext';
import {Ellipse} from "./ellipse";
import {EndPoint} from "./point";

const __v = [0, 0, 0];

export class NurbsObject extends SketchObject {

  constructor(curve, id) {
    super(id);
    this.curve = curve;
    const cp = curve.data.controlPoints;
    this.a = new EndPoint(cp[0].x, cp[0].y, this.id + ":A");
    this.b = new EndPoint(cp[cp.length - 1].x, cp[cp.length - 1].y, this.id + ":B");
    this.bezierPieces = this.calcBezierPiecewise();
  }

  visitParams(callback) {
    this.a.visitParams(callback);
    this.b.visitParams(callback);
  }

  normalDistance(aim) {
    __v[0] = aim.x;
    __v[1] = aim.y;
    const point = this.curve.point(this.curve.param(__v));
    return vec.distance(__v, point);
  }
  
  drawImpl(ctx, scale, viewer) {
    for (const bz of this.bezierPieces) {
      ctx.beginPath();
      ctx.moveTo(bz.cp0[0], bz.cp0[1]);
      // ctx.lineTo(bz.cp3[0], bz.cp3[1]);
      ctx.bezierCurveTo(bz.cp1[0], bz.cp1[1], bz.cp2[0], bz.cp2[1], bz.cp3[0], bz.cp3[1]);
      ctx.stroke();

      // DrawPoint(ctx, bz.cp0[0], bz.cp0[1], 3, scale)
      // DrawPoint(ctx, bz.cp1[0], bz.cp1[1], 3, scale)
      // DrawPoint(ctx, bz.cp2[0], bz.cp2[1], 3, scale)
      // DrawPoint(ctx, bz.cp3[0], bz.cp3[1], 3, scale)
      
    }
  }

  calcBezierPiecewise() {
    const pieces = [];
    const knots = this.curve.knots();

    const [from, to] = this.curve.domain();
    
    const tess = curveTessellate(this.curve.data, from, to);
    
    const evalCurve = t => {
      const [P, D] = this.curve.eval(t, 1);
       return {
         P, D, M: vec.normalize(D)
       };
    };
    let t0 = tess[0];
    let eval0 = evalCurve(t0);
    for (let i = 1; i < tess.length; ++i) {
      const t1 = tess[i];
      const eval1 = evalCurve(t1);

      const {P: P0, M: M0} = eval0;
      const {P: P3, M: M1} = eval1;

      const k = vec.length(vec.sub(P0, P3)) / 3;

      const P1 = vec._add(vec.mul(M0,  k), P0) ;
      const P2 = vec._add(vec.mul(M1, -k), P3) ;

      pieces.push({
        cp0: P0,
        cp1: P1,
        cp2: P2,
        cp3: P3,
      });
      eval0 = eval1;
      t0 = t1;
    }
    return pieces;
  }
}

NurbsObject.prototype._class = 'TCAD.TWO.NurbsObject';
NurbsObject.prototype.TYPE = 'NurbsObject';
