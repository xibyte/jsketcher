import {fillArray} from "gems/iterables";

/**
 * This intermediate layer should be eliminated since constraint server isn't used anymore
 */

function createByConstraintName(name, params, values) {
  switch (name) {
    case "equal":
      return new Equal(params);
    case "equalsTo":
      return new EqualsTo(params, values[0]);
    case "Diff":
      return new Diff(params, values[0]);
    case "MinLength":
      return new MinLength(params, values[0]);
    case "perpendicular":
      return new Perpendicular(params);
    case "parallel":
      return new Parallel(params);
    case "signedPerpendicular":
      return new SignedPerpendicular(params);
    case "P2LDistanceSigned":
      return new P2LDistanceSigned(params, values[0]);
    case "P2LDistance":
      return new P2LDistance(params, values[0]);
    case "P2LDistanceV":
      return new P2LDistanceV(params);
    case "P2PDistance":
      return new P2PDistance(params, values[0]);
    case "P2PDistanceV":
      return new P2PDistanceV(params);
    case "PointOnEllipse":
      return new PointOnEllipse(params);
    case "PointOnCurve":
      return new PointOnCurve(params, values[0]);
    case "EllipseTangent":
      return new EllipseTangent(params);
    case "CurveTangent":
      return new CurveTangent(params, values[0]);
    case "angle":
      return new Angle(params);
    case "angleConst": {
      const _ = true, x = false;
      // Exclude angle value from parameters
      return new ConstantWrapper(new Angle(params), [x, x, x, x, x, x, x, x, _]);
    }
    case 'LockConvex':
      return new LockConvex(params);
    case 'GreaterThan':
      return new GreaterThan(params, values[0]);
    
  }
}

function Equal(params) {

  this.params = params;

  this.error = function() {
    return this.params[0].get() - this.params[1].get();
  };

  this.gradient = function(out) {
    out[0] = 1;
    out[1] = -1;
  }
}


function MinLength(params, distance) {
  
  this.params = params;
  this.distance = distance;

  const p1x = 0;
  const p1y = 1;
  const p2x = 2;
  const p2y = 3;

  this.error = function() {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    const d = Math.sqrt(dx * dx + dy * dy);
    return d < this.distance ? (d - this.distance) : 0;
  };

  this.gradient = function(out) {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      d = 0.000001;
    }
    if (d >= this.distance) {
      out[p1x] = 0;
      out[p1y] = 0;
      out[p2x] = 0;
      out[p2y] = 0;
    }
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
  }
}

function LockConvex(params) {
  this.params = params;

  const _pcx = 0;
  const _pcy = 1;
  const _pax = 2;
  const _pay = 3;
  const _ptx = 4;
  const _pty = 5;

  this.error = function() {
    const cx = params[_pcx].get();
    const cy = params[_pcy].get();
    const ax = params[_pax].get();
    const ay = params[_pay].get();
    const tx = params[_ptx].get();
    const ty = params[_pty].get();
    
    const crossProductNorm = (cx - ax) * (ty - ay) - (cy - ay) * (tx - ax);

    const violate = crossProductNorm < 0;
    return violate ? crossProductNorm : 0;
  };

  this.gradient = function(out) {
    const cx = params[_pcx].get();
    const cy = params[_pcy].get();
    const ax = params[_pax].get();
    const ay = params[_pay].get();
    const tx = params[_ptx].get();
    const ty = params[_pty].get();

    out[_pcx] = ty-ay;
    out[_pcy] = ax-tx;
    out[_pax] = cy-ty;
    out[_pay] = tx-cx;
    out[_ptx] = ay-cy;
    out[_pty] = cx-ax;
  }
}

function ConstantWrapper(constr, mask) {

  this.params = [];
  this.grad = [];
  
  for (let j = 0; j < constr.params.length; j++) {
    if (!mask[j]) {
      this.params.push(constr.params[j]);
    }
    this.grad.push(0);
  }

  this.error = function() {
    return constr.error();
  };

  this.gradient = function(out) {
    fillArray(this.grad, 0, this.grad.length, 0);
    constr.gradient(this.grad);
    let jj = 0;
    for (let j = 0; j < mask.length; j++) {
      if (!mask[j]) {
        out[jj ++] = this.grad[j];
      }
    }
  }
}

function Weighted(constr, weight) {

  this.weight = weight;
  this.params = constr.params;
  this.constr = constr;
   
  this.error = function() {
    return constr.error() * this.weight;
  };

  this.gradient = function(out) {
    constr.gradient(out);
    for (let i = 0; i < out.length; i++) {
      out[i] *= this.weight;
    }
  }
}

function EqualsTo(params, value) {

  this.params = params;
  this.value = value;

  this.error = function() {
    return this.params[0].get() - this.value;
  };

  this.gradient = function(out) {
    out[0] = 1;
  };
}

function Diff(params, value) {

  this.params = params;
  this.value = value;

  this.error = function() {
    return this.params[0].get() - this.params[1].get() - this.value;
  };

  this.gradient = function(out) {
    out[0] =  1;
    out[1] = -1;
  };
}

function P2LDistanceSigned(params, value) {

  const TX = 0;
  const TY = 1;
  const AX = 2;
  const AY = 3;
  const BX = 4;
  const BY = 5;

  this.params = params;
  this.value = value;

  this.error = function() {
    const tx = params[TX].get(), ax = params[AX].get(), bx = params[BX].get();
    const ty = params[TY].get(), ay = params[AY].get(), by = params[BY].get();
    const d = Math.sqrt(sq(by - ay) + sq(bx - ax));
    
    return (-(by - ay) * (tx - ax) ) / d + ((bx - ax) * (ty - ay)) / d - this.value;
  };

  this.gradient = NumericGradient;
}

function P2LDistance(params, distance) {

  this.params = params;
  this.distance = distance;

  const TX = 0;
  const TY = 1;
  const LP1X = 2;
  const LP1Y = 3;
  const LP2X = 4;
  const LP2Y = 5;

  this.error = function() {
    const x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    const y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      return 0;
    }
    const A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    return Math.abs(A) / d -  this.distance;
  };

  this.gradient = function(out) {
    const x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    const y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    const d3 = d * d2;
//    var AA = -x0 * (y2 - y1) + y0 * (x2 - x1) + x1 * y2 - x2 * y1;
    const A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    const AM = Math.abs(A);
    const j = A < 0 ? -1 : 1;

    out[TX] = j * (y1 - y2) / d;
    out[TY] = j * (x2 - x1) / d;

    out[LP1X] = j * (y2 - y0) / d + AM * dx / d3;
    out[LP1Y] = j * (x0 - x2) / d + AM * dy / d3;
    out[LP2X] = j * (y0 - y1) / d - AM * dx / d3;
    out[LP2Y] = j * (x1 - x0) / d - AM * dy / d3;

    _fixNaN(out);
  }
}

function P2LDistanceV(params) {

  this.params = params;//.slice(0, params.length -1);

  const TX = 0;
  const TY = 1;
  const LP1X = 2;
  const LP1Y = 3;
  const LP2X = 4;
  const LP2Y = 5;
  const D = 6;

  this.error = function() {
    const x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    const y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    const dist = this.params[D].get();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      return 0;
    }
    const A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    return Math.abs(A) / d - dist;
  };

  this.gradient = function(out) {
    const x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    const y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    const d3 = d * d2;
//    var AA = -x0 * (y2 - y1) + y0 * (x2 - x1) + x1 * y2 - x2 * y1;
    const A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    const AM = Math.abs(A);
    const j = A < 0 ? -1 : 1;
    
    out[TX] = j * (y1 - y2) / d;
    out[TY] = j * (x2 - x1) / d;
    
    out[LP1X] = j * (y2 - y0) / d + AM * dx / d3;
    out[LP1Y] = j * (x0 - x2) / d + AM * dy / d3;
    out[LP2X] = j * (y0 - y1) / d - AM * dx / d3;
    out[LP2Y] = j * (x1 - x0) / d - AM * dy / d3;
    out[D] = -1;

    _fixNaN(out);
  }

}

function P2PDistance(params, distance) {

  this.params = params;
  this.distance = distance;

  const p1x = 0;
  const p1y = 1;
  const p2x = 2;
  const p2y = 3;

  this.error = function() {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    const d = Math.sqrt(dx * dx + dy * dy);
    return (d - this.distance);
  };

  this.gradient = function(out) {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      if (this.distance == 0) return;
      d = 0.000001;
    }
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
    
  }
}

function P2PDistanceV(params) {

  this.params = params;

  const p1x = 0;
  const p1y = 1;
  const p2x = 2;
  const p2y = 3;
  const D = 4;

  this.error = function() {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    const d = Math.sqrt(dx * dx + dy * dy);
    return (d - params[D].get());
  };

  this.gradient = function(out) {
    const dx = params[p1x].get() - params[p2x].get();
    const dy = params[p1y].get() - params[p2y].get();
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      if (params[D].get() == 0) return;
      d = 0.000001;
    }
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
    out[D] = -1;
  }
}

function SignedPerpendicular(params) {

  this.params = params;

  const X1 = 0;
  const Y1 = 1;
  const X2 = 2;
  const Y2 = 3;
  const X3 = 4;
  const Y3 = 5;
  const X4 = 6;
  const Y4 = 7;

  this.error = function() {
    const x1 = params[X1].get();
    const x2 = params[X2].get();
    const y1 = params[Y1].get();
    const y2 = params[Y2].get();
    const x3 = params[X3].get();
    const x4 = params[X4].get();
    const y4 = params[Y4].get();
    const y3 = params[Y3].get();

    const dx1 = y1 - y2;
    const dy1 = x2 - x1;

    const dx2 = x4 - x3;
    const dy2 = y4 - y3;

    const c1 = Math.sqrt(sq(dx1) + sq(dy1));
    const c2 = Math.sqrt(sq(dx2) + sq(dy2));

    return dx1*dx2 + dy1*dy2 - c1 * c2;
  };

  //d(((x-a) * (b - c))^2 ) / dx

  this.gradient = function (out) {
    const x1 = params[X1].get();
    const x2 = params[X2].get();
    const y1 = params[Y1].get();
    const y2 = params[Y2].get();

    const x3 = params[X3].get();
    const x4 = params[X4].get();
    const y3 = params[Y3].get();
    const y4 = params[Y4].get();

    const dx1 = y1 - y2;
    const dy1 = x2 - x1;

    const dx2 = x4 - x3;
    const dy2 = y4 - y3;

    const c1 = Math.max(Math.sqrt(sq(dx1) + sq(dy1)), 0.001);
    const c2 = Math.max(Math.sqrt(sq(dx2) + sq(dy2)), 0.001);

    out[X1] = y3 - y4 + (c2 * (x2 - x1)) / c1;
    out[X2] = y4 - y3 - (c2 * (x2 - x1)) / c1;
    out[Y1] = x4 - x3 - (c2 * (y1 - y2)) / c1;
    out[Y2] = x3 - x4 + (c2 * (y1 - y2)) / c1;
    out[X3] = y2 - y1 + (c1 * (x4 - x3)) / c2;
    out[X4] = y1 - y2 - (c1 * (x4 - x3)) / c2;
    out[Y3] = x1 - x2 + (c1 * (y4 - y3)) / c2;
    out[Y4] = x2 - x1 - (c1 * (y4 - y3)) / c2;
  }
  // this.gradient = NumericGradient;

}


function Parallel(params) {

  this.params = params;

  const l1p1x = 0;
  const l1p1y = 1;
  const l1p2x = 2;
  const l1p2y = 3;
  const l2p1x = 4;
  const l2p1y = 5;
  const l2p2x = 6;
  const l2p2y = 7;
  
  this.error = function() {
    const dx1 = (params[l1p1x].get() - params[l1p2x].get());
    const dy1 = (params[l1p1y].get() - params[l1p2y].get());
    const dx2 = (params[l2p1x].get() - params[l2p2x].get());
    const dy2 = (params[l2p1y].get() - params[l2p2y].get());
    return (dx1*dy2 - dy1*dx2);
  };

  this.gradient = function(out) {
    out[l1p1x] =  (params[l2p1y].get() - params[l2p2y].get());
    out[l1p2x] = -(params[l2p1y].get() - params[l2p2y].get());
    out[l1p1y] = -(params[l2p1x].get() - params[l2p2x].get());
    out[l1p2y] =  (params[l2p1x].get() - params[l2p2x].get());
    out[l2p1x] = -(params[l1p1y].get() - params[l1p2y].get());
    out[l2p2x] =  (params[l1p1y].get() - params[l1p2y].get());
    out[l2p1y] =  (params[l1p1x].get() - params[l1p2x].get());
    out[l2p2y] = -(params[l1p1x].get() - params[l1p2x].get());
  }
}

function Perpendicular(params) {

  this.params = params;

  const l1p1x = 0;
  const l1p1y = 1;
  const l1p2x = 2;
  const l1p2y = 3;
  const l2p1x = 4;
  const l2p1y = 5;
  const l2p2x = 6;
  const l2p2y = 7;

  this.error = function() {
    const dx1 = (params[l1p1x].get() - params[l1p2x].get());
    const dy1 = (params[l1p1y].get() - params[l1p2y].get());
    const dx2 = (params[l2p1x].get() - params[l2p2x].get());
    const dy2 = (params[l2p1y].get() - params[l2p2y].get());
    //dot product shows how the lines off to be perpendicular
    return (dx1*dx2 + dy1*dy2);
  };

  this.gradient = function(out) {
    out[l1p1x] =  (params[l2p1x].get() - params[l2p2x].get());
    out[l1p2x] = -(params[l2p1x].get() - params[l2p2x].get());
    out[l1p1y] =  (params[l2p1y].get() - params[l2p2y].get());
    out[l1p2y] = -(params[l2p1y].get() - params[l2p2y].get());
    out[l2p1x] =  (params[l1p1x].get() - params[l1p2x].get());
    out[l2p2x] = -(params[l1p1x].get() - params[l1p2x].get());
    out[l2p1y] =  (params[l1p1y].get() - params[l1p2y].get());
    out[l2p2y] = -(params[l1p1y].get() - params[l1p2y].get());
  }
}

function Angle(params) {

  this.params = params;

  const l1p1x = 0;
  const l1p1y = 1;
  const l1p2x = 2;
  const l1p2y = 3;
  const l2p1x = 4;
  const l2p1y = 5;
  const l2p2x = 6;
  const l2p2y = 7;
  const angle = 8;
  const scale = 1000; // we need scale to get same order of measure units(radians are to small)

  function p(ref) {
    return params[ref].get();
  }

  this.error = function() {
    const dx1 = (p(l1p2x) - p(l1p1x));
    const dy1 = (p(l1p2y) - p(l1p1y));
    const dx2 = (p(l2p2x) - p(l2p1x));
    const dy2 = (p(l2p2y) - p(l2p1y));
    const a = Math.atan2(dy1,dx1) + p(angle);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x2 = dx2*ca + dy2*sa;
    const y2 = -dx2*sa + dy2*ca;
    return Math.atan2(y2,x2) * scale;
  };

  this.gradient = function (out) {
    let dx1 = (p(l1p2x) - p(l1p1x));
    let dy1 = (p(l1p2y) - p(l1p1y));
    let r2 = dx1 * dx1 + dy1 * dy1;
    out[l1p1x] = -dy1 / r2;
    out[l1p1y] = dx1 / r2;
    out[l1p2x] = dy1 / r2;
    out[l1p2y] = -dx1 / r2;
    dx1 = (p(l1p2x) - p(l1p1x));
    dy1 = (p(l1p2y) - p(l1p1y));
    let dx2 = (p(l2p2x) - p(l2p1x));
    let dy2 = (p(l2p2y) - p(l2p1y));
    const a = Math.atan2(dy1, dx1) + p(angle);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x2 = dx2 * ca + dy2 * sa;
    const y2 = -dx2 * sa + dy2 * ca;
    r2 = dx2 * dx2 + dy2 * dy2;
    dx2 = -y2 / r2;
    dy2 = x2 / r2;
    out[l2p1x] = (-ca * dx2 + sa * dy2);
    out[l2p1y] = (-sa * dx2 - ca * dy2);
    out[l2p2x] = ( ca * dx2 - sa * dy2);
    out[l2p2y] = ( sa * dx2 + ca * dy2);
    out[angle] = -1;
    rescale(out, scale);
  }
}

function PointOnEllipse(params) {

  this.params = params;

  const PX = 0;
  const PY = 1;
  const EP1X = 2;
  const EP1Y = 3;
  const EP2X = 4;
  const EP2Y = 5;
  const R = 6;

  this.error = function() {
    const px = params[PX].get();
    const py = params[PY].get();
    const ep1x = params[EP1X].get();
    const ep1y = params[EP1Y].get();
    const ep2x = params[EP2X].get();
    const ep2y = params[EP2Y].get();
    const radiusY = params[R].get();
  
    const centerX = ep1x + (ep2x - ep1x) * 0.5;
    const centerY = ep1y + (ep2y - ep1y) * 0.5;
    const rotation = Math.atan2(ep2y - ep1y, ep2x - ep1x);

    const x = px - centerX;
    const y = py - centerY;

    const polarAngle = Math.atan2(y, x) - rotation;
    const polarRadius = Math.sqrt(x*x + y*y);
    const radiusX = Math.sqrt(sq(ep1x - ep2x) + sq(ep1y - ep2y)) * 0.5;
    
    const L = Math.sqrt(1/( sq(Math.cos(polarAngle)/radiusX) + sq(Math.sin(polarAngle)/radiusY)));
    return L - polarRadius
  };

  this.gradient = NumericGradient;
}

function PointOnCurve(params, curve) {

  this.params = params;

  const PX = 0;
  const PY = 1;
  
  const pt = [0,0,0];
  
  this.error = function() {
    const px = params[PX].get();
    const py = params[PY].get();
    pt[0] = px;
    pt[1] = py;
    const u = curve.param(pt);
    const p = curve.point(u);
    return Math.sqrt( sq(p[0] - px) + sq(p[1] - py) )
  };

  this.gradient = NumericGradient;
}

function CurveTangent(params, curve) {

  this.params = params;

  const tmp = [0,0,0];

  const P1X = 0;
  const P1Y = 1;
  const P2X = 2;
  const P2Y = 3;
  const TX = 4;
  const TY = 5;
  
  this.error = function() {
    const x1 = params[P1X].get();
    const y1 = params[P1Y].get();
    const x2 = params[P2X].get();
    const y2 = params[P2Y].get();
    const tx = params[TX].get();
    const ty = params[TY].get();

    tmp[0] = tx;
    tmp[1] = ty;
    const t = curve.param(tmp);
    const [P, D] = curve.eval(t, 1);

    const l = Math.sqrt(sq(D[0]) + sq(D[1]));
    
    const vx = - D[1] / l;
    const vy = D[0] / l;
    return Math.abs(vx * (P[0] - x1) + vy * (P[1] - y1)) + Math.abs(vx * (P[0] - x2) + vy * (P[1] - y2));  
  };

  this.gradient = NumericGradient;
}

function EllipseTangent(params) {

  this.params = params;

  const P1X = 0;
  const P1Y = 1;
  const P2X = 2;
  const P2Y = 3;
  const EP1X = 4;
  const EP1Y = 5;
  const EP2X = 6;
  const EP2Y = 7;
  const R = 8;

  this.error = function(gr) {
    const p1x = params[P1X].get();
    const p1y = params[P1Y].get();
    const p2x = params[P2X].get();
    const p2y = params[P2Y].get();

    const ep1x = params[EP1X].get();
    const ep1y = params[EP1Y].get();
    const ep2x = params[EP2X].get();
    const ep2y = params[EP2Y].get();
    
    const radiusY = params[R].get();

    const axisX = ep2x - ep1x;
    const axisY = ep2y - ep1y;
    const radiusX = Math.sqrt(sq(axisX) + sq(axisY)) * 0.5;
    const scaleToCircleSpace = radiusY / radiusX;
    const rotation = - Math.atan2(axisY, axisX);
    function tr(x, y) {
      let xx =  x * Math.cos(rotation) - y * Math.sin(rotation)
      const yy =  x * Math.sin(rotation) + y * Math.cos(rotation);
      xx *= scaleToCircleSpace;
      return {x: xx, y: yy};
    }
    
    const axis = tr(axisX, axisY);
    const p1 = tr(p1x, p1y);
    const p2 = tr(p2x, p2y);
    const ep1 = tr(ep1x, ep1y);

    const centerX = ep1.x + axis.x * 0.5;
    const centerY = ep1.y + axis.y * 0.5;
    
    
    let normalX = -(p2.y - p1.y);
    let normalY =   p2.x - p1.x;
    
    const normalD = Math.sqrt(sq(normalX) + sq(normalY));
    normalX /= normalD;
    normalY /= normalD;
      
      //this length of normal of line to center 
    let perpendicularLength = (centerX - p1.x) * normalX + (centerY - p1.y) * normalY;

    if (perpendicularLength < 0) {
      perpendicularLength *= -1;
    }
    
    return (radiusY - perpendicularLength); //*1000;
  };

  this.gradient = NumericGradient;
}

function GreaterThan(params, limit) {

  this.params = params;
  
  this.error = function() {
    const value = this.params[0].get();
    const error = value <= limit ? limit - value : 0;
    console.log("GreaterThan: " + error + ", value: " +value);
    return error;
  };

  this.gradient = function(out) {
    out[0] = -1;
  }
}


export function NumericGradient(out) {
  const h = 1;
  const approx = (param) => {
    const fx = this.error();
    this.params[param].set(this.params[param].get() + h);
    const fhx = this.error();
    this.params[param].set(this.params[param].get() - h);
    return (fhx - fx) / h;
  };

  for (let i = 0; i < out.length; i++) {
    out[i] = approx(i);
  }
}

function _fixNaN(grad) {
  for (let i = 0; i < grad.length; i++) {
    if (isNaN(grad[i])) {
      grad[i] = 0;
    }
  }
}

function rescale(grad, factor) {
  for (let i = 0; i < grad.length; i++) {
    grad[i] *= factor;
  }
}

const sq = x => x * x;

export {createByConstraintName, EqualsTo, ConstantWrapper}