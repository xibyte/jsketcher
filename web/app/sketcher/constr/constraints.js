TCAD.constraints = {};

/**
 * This intermediate layer should be eliminated since constraint server isn't used anymore
 */
TCAD.constraints.create = function(name, params, values) {
  switch (name) {
    case "equal":
      return new TCAD.constraints.Equal(params);
    case "equalsTo":
      return new TCAD.constraints.EqualsTo(params, values[0]);
    case "MinLength":
      return new TCAD.constraints.MinLength(params, values[0]);
    case "perpendicular":
      return new TCAD.constraints.Perpendicular(params);
    case "parallel":
      return new TCAD.constraints.Parallel(params);
    case "P2LDistance":
      return new TCAD.constraints.P2LDistance(params, values[0]);
    case "P2LDistanceV":
      return new TCAD.constraints.P2LDistanceV(params);
    case "P2PDistance":
      return new TCAD.constraints.P2PDistance(params, values[0]);
    case "P2PDistanceV":
      return new TCAD.constraints.P2PDistanceV(params);
    case "angle":
      return new TCAD.constraints.Angle(params);
    case "angleConst":
      var _ = true, x = false;
      // Exclude angle value from parameters
      return new TCAD.constraints.ConstantWrapper(new TCAD.constraints.Angle(params), [x,x,x,x,x,x,x,x,_]);
    case 'LockConvex':
      return new TCAD.constraints.LockConvex(params);
  }
};

/** @constructor */
TCAD.constraints.Equal = function(params) {

  this.params = params;

  this.error = function() {
    return this.params[0].get() - this.params[1].get();
  };

  this.gradient = function(out) {
    out[0] = 1;
    out[1] = -1;
  }
};


TCAD.constraints.MinLength = function(params, distance) {
  
  this.params = params;
  this.distance = distance;

  var p1x = 0;
  var p1y = 1;
  var p2x = 2;
  var p2y = 3;

  this.error = function() {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
    return d < this.distance ? (d - this.distance) : 0;
  };

  this.gradient = function(out) {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
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
};

TCAD.constraints.LockConvex = function(params) {
  this.params = params;

  var _pcx = 0;
  var _pcy = 1;
  var _pax = 2;
  var _pay = 3;
  var _ptx = 4;
  var _pty = 5;

  this.error = function() {
    var cx = params[_pcx].get();
    var cy = params[_pcy].get();
    var ax = params[_pax].get();
    var ay = params[_pay].get();
    var tx = params[_ptx].get();
    var ty = params[_pty].get();
    
    var crossProductNorm = (cx - ax) * (ty - ay) - (cy - ay) * (tx - ax);

    var violate = crossProductNorm < 0;
    return violate ? crossProductNorm : 0;
  };

  this.gradient = function(out) {
    var cx = params[_pcx].get();
    var cy = params[_pcy].get();
    var ax = params[_pax].get();
    var ay = params[_pay].get();
    var tx = params[_ptx].get();
    var ty = params[_pty].get();

    out[_pcx] = ty-ay;
    out[_pcy] = ax-tx;
    out[_pax] = cy-ty;
    out[_pay] = tx-cx;
    out[_ptx] = ay-cy;
    out[_pty] = cx-ax;
  }
};


/** @constructor */
TCAD.constraints.ConstantWrapper = function(constr, mask) {

  this.params = [];
  this.grad = [];
  var j;
  
  for (j = 0; j < constr.params.length; j++) {
    if (!mask[j]) {
      this.params.push(constr.params[j]);
    }
    this.grad.push(0);
  }

  this.error = function() {
    return constr.error();
  };

  this.gradient = function(out) {
    TCAD.math.Arrays_fill(this.grad, 0, this.grad.length, 0);
    constr.gradient(this.grad);
    var jj = 0;
    for (j = 0; j < mask.length; j++) {
      if (!mask[j]) {
        out[jj ++] = this.grad[j];
      }
    }
  }
};

/** @constructor */
TCAD.constraints.Weighted = function(constr, weight) {

  this.weight = weight;
  this.params = constr.params;
  this.constr = constr;
   
  this.error = function() {
    return constr.error() * this.weight;
  };

  this.gradient = function(out) {
    constr.gradient(out);
    for (var i = 0; i < out.length; i++) {
      out[i] *= this.weight;
    }
  }
};


/** @constructor */
TCAD.constraints.EqualsTo = function(params, value) {

  this.params = params;
  this.value = value;

  this.error = function() {
    return this.params[0].get() - this.value;
  };

  this.gradient = function(out) {
    out[0] = 1;
  };
};

/** @constructor */
TCAD.constraints.P2LDistance = function(params, distance) {

  this.params = params;
  this.distance = distance;

  var TX = 0;
  var TY = 1;
  var LP1X = 2;
  var LP1Y = 3;
  var LP2X = 4;
  var LP2Y = 5;

  this.error = function() {
    var x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    var y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      return 0;
    }
    var A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    return Math.abs(A) / d -  this.distance;
  };

  this.gradient = function(out) {
    var x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    var y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d2 = dx * dx + dy * dy;
    var d = Math.sqrt(d2);
    var d3 = d * d2;
//    var AA = -x0 * (y2 - y1) + y0 * (x2 - x1) + x1 * y2 - x2 * y1;
    var A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    var AM = Math.abs(A);
    var j = A < 0 ? -1 : 1;

    out[TX] = j * (y1 - y2) / d;
    out[TY] = j * (x2 - x1) / d;

    out[LP1X] = j * (y2 - y0) / d + AM * dx / d3;
    out[LP1Y] = j * (x0 - x2) / d + AM * dy / d3;
    out[LP2X] = j * (y0 - y1) / d - AM * dx / d3;
    out[LP2Y] = j * (x1 - x0) / d - AM * dy / d3;

    TCAD.constraints._fixNaN(out);
  }
};

/** @constructor */
TCAD.constraints.P2LDistanceV = function(params) {

  this.params = params;//.slice(0, params.length -1);

  var TX = 0;
  var TY = 1;
  var LP1X = 2;
  var LP1Y = 3;
  var LP2X = 4;
  var LP2Y = 5;
  var D = 6;

  this.error = function() {
    var x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    var y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    var dist = this.params[D].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      return 0;
    }
    var A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    return Math.abs(A) / d - dist;
  };

  this.gradient = function(out) {
    var x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    var y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d2 = dx * dx + dy * dy;
    var d = Math.sqrt(d2);
    var d3 = d * d2;
//    var AA = -x0 * (y2 - y1) + y0 * (x2 - x1) + x1 * y2 - x2 * y1;
    var A = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    var AM = Math.abs(A);
    var j = A < 0 ? -1 : 1;
    
    out[TX] = j * (y1 - y2) / d;
    out[TY] = j * (x2 - x1) / d;
    
    out[LP1X] = j * (y2 - y0) / d + AM * dx / d3;
    out[LP1Y] = j * (x0 - x2) / d + AM * dy / d3;
    out[LP2X] = j * (y0 - y1) / d - AM * dx / d3;
    out[LP2Y] = j * (x1 - x0) / d - AM * dy / d3;
    out[D] = -1;

    TCAD.constraints._fixNaN(out);
  }

};
/** @constructor */
TCAD.constraints.P2PDistance = function(params, distance) {

  this.params = params;
  this.distance = distance;

  var p1x = 0;
  var p1y = 1;
  var p2x = 2;
  var p2y = 3;

  this.error = function() {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
    return (d - this.distance);
  };

  this.gradient = function(out) {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d == 0) {
      if (this.distance == 0) return;
      d = 0.000001;
    }
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
    
  }
};


/** @constructor */
TCAD.constraints.P2PDistanceV = function(params) {

  this.params = params;

  var p1x = 0;
  var p1y = 1;
  var p2x = 2;
  var p2y = 3;
  var D = 4;

  this.error = function() {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
    return (d - params[D].get());
  };

  this.gradient = function(out) {
    var dx = params[p1x].get() - params[p2x].get();
    var dy = params[p1y].get() - params[p2y].get();
    var d = Math.sqrt(dx * dx + dy * dy);
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
};


/** @constructor */
TCAD.constraints.Parallel = function(params) {

  this.params = params;

  var l1p1x = 0;
  var l1p1y = 1;
  var l1p2x = 2;
  var l1p2y = 3;
  var l2p1x = 4;
  var l2p1y = 5;
  var l2p2x = 6;
  var l2p2y = 7;
  
  this.error = function() {
    var dx1 = (params[l1p1x].get() - params[l1p2x].get());
    var dy1 = (params[l1p1y].get() - params[l1p2y].get());
    var dx2 = (params[l2p1x].get() - params[l2p2x].get());
    var dy2 = (params[l2p1y].get() - params[l2p2y].get());
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
};

/** @constructor */
TCAD.constraints.Perpendicular = function(params) {

  this.params = params;

  var l1p1x = 0;
  var l1p1y = 1;
  var l1p2x = 2;
  var l1p2y = 3;
  var l2p1x = 4;
  var l2p1y = 5;
  var l2p2x = 6;
  var l2p2y = 7;

  this.error = function() {
    var dx1 = (params[l1p1x].get() - params[l1p2x].get());
    var dy1 = (params[l1p1y].get() - params[l1p2y].get());
    var dx2 = (params[l2p1x].get() - params[l2p2x].get());
    var dy2 = (params[l2p1y].get() - params[l2p2y].get());
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
};

/** @constructor */
TCAD.constraints.Angle = function(params) {

  this.params = params;

  var l1p1x = 0;
  var l1p1y = 1;
  var l1p2x = 2;
  var l1p2y = 3;
  var l2p1x = 4;
  var l2p1y = 5;
  var l2p2x = 6;
  var l2p2y = 7;
  var angle = 8;
  var scale = 1000; // we need scale to get same order of measure units(radians are to small)

  function p(ref) {
    return params[ref].get();
  }

  this.error = function() {
    var dx1 = (p(l1p2x) - p(l1p1x));
    var dy1 = (p(l1p2y) - p(l1p1y));
    var dx2 = (p(l2p2x) - p(l2p1x));
    var dy2 = (p(l2p2y) - p(l2p1y));
    var a = Math.atan2(dy1,dx1) + p(angle);
    var ca = Math.cos(a);
    var sa = Math.sin(a);
    var x2 = dx2*ca + dy2*sa;
    var y2 = -dx2*sa + dy2*ca;
    return Math.atan2(y2,x2) * scale;
  };

  this.gradient = function (out) {
    var dx1 = (p(l1p2x) - p(l1p1x));
    var dy1 = (p(l1p2y) - p(l1p1y));
    var r2 = dx1 * dx1 + dy1 * dy1;
    out[l1p1x] = -dy1 / r2;
    out[l1p1y] = dx1 / r2;
    out[l1p2x] = dy1 / r2;
    out[l1p2y] = -dx1 / r2;
    var dx1 = (p(l1p2x) - p(l1p1x));
    var dy1 = (p(l1p2y) - p(l1p1y));
    var dx2 = (p(l2p2x) - p(l2p1x));
    var dy2 = (p(l2p2y) - p(l2p1y));
    var a = Math.atan2(dy1, dx1) + p(angle);
    var ca = Math.cos(a);
    var sa = Math.sin(a);
    var x2 = dx2 * ca + dy2 * sa;
    var y2 = -dx2 * sa + dy2 * ca;
    var r2 = dx2 * dx2 + dy2 * dy2;
    dx2 = -y2 / r2;
    dy2 = x2 / r2;
    out[l2p1x] = (-ca * dx2 + sa * dy2);
    out[l2p1y] = (-sa * dx2 - ca * dy2);
    out[l2p2x] = ( ca * dx2 - sa * dy2);
    out[l2p2y] = ( sa * dx2 + ca * dy2);
    out[angle] = -1;
    TCAD.constraints.rescale(out, scale);
  }
};

TCAD.constraints._fixNaN = function(grad) {
  for (var i = 0; i < grad.length; i++) {
    if (isNaN(grad[i])) {
      grad[i] = 0;
    }
  }
};

TCAD.constraints.rescale = function(grad, factor) {
  for (var i = 0; i < grad.length; i++) {
    grad[i] *= factor;
  }
};