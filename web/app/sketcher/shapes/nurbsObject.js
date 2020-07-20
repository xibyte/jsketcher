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
    let cp = curve.data.controlPoints;
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
    let point = this.curve.point(this.curve.param(__v));
    return vec.distance(__v, point);
  }
  
  drawImpl(ctx, scale, viewer) {
    for (let bz of this.bezierPieces) {
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
    let pieces = [];
    let knots = this.curve.knots();

    let [from, to] = this.curve.domain();
    
    let tess = curveTessellate(this.curve.data, from, to);
    
    const evalCurve = t => {
      let [P, D] = this.curve.eval(t, 1);
       return {
         P, D, M: vec.normalize(D)
       };
    };
    let t0 = tess[0];
    let eval0 = evalCurve(t0);
    for (let i = 1; i < tess.length; ++i) {
      let t1 = tess[i];
      let eval1 = evalCurve(t1);

      let {P: P0, M: M0} = eval0;
      let {P: P3, M: M1} = eval1;

      let k = vec.length(vec.sub(P0, P3)) / 3;

      let P1 = vec._add(vec.mul(M0,  k), P0) ;
      let P2 = vec._add(vec.mul(M1, -k), P3) ;

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
