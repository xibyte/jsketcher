TCAD.constraints = {};

TCAD.constraints.create = function(name, params, values) {
  switch (name) {
    case "equal":
      return new TCAD.constraints.Equal(params);
    case "equalsTo":
      return new TCAD.constraints.EqualsTo(params, values[0]);
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

  var tx = 0;
  var ty = 1;
  var lp1x = 2;
  var lp1y = 3;
  var lp2x = 4;
  var lp2y = 5;

  this.error = function() {
    var x0 = params[tx].get(), x1 = params[lp1x].get(), x2 = params[lp2x].get();
    var y0 = params[ty].get(), y1 = params[lp1y].get(), y2 = params[lp2y].get();
    var dist = this.distance;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d = Math.sqrt(dx * dx + dy * dy);
    //calculate triangle area
    var area = Math.abs
    (-x0 * dy + y0 * dx + x1 * y2 - x2 * y1);
    if (d == 0) {
      return 0;
    }
    return (area / d - dist);
  };

  this.gradient = function(out) {
    var x0 = params[tx].get(), x1 = params[lp1x].get(), x2 = params[lp2x].get();
    var y0 = params[ty].get(), y1 = params[lp1y].get(), y2 = params[lp2y].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d2 = dx * dx + dy * dy;
    var d = Math.sqrt(d2);
    var area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    out[tx]   = ((y1 - y2) / d);
    out[ty]   = ((x2 - x1) / d);
    out[lp1x] = (((y2 - y0) * d + (dx / d) * area) / d2);
    out[lp1y] = (((x0 - x2) * d + (dy / d) * area) / d2);
    out[lp2x] = (((y0 - y1) * d - (dx / d) * area) / d2);
    out[lp2y] = (((x1 - x0) * d - (dy / d) * area) / d2);

    for (var i = 0; i < 6; i++) {
      if (Number.isNaN(out[i])) {
        out[i] = 0;
      }
      if (area < 0) {
          out[i] *= -1;
      }
    }
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
    var area = Math.abs
    (-x0 * dy + y0 * dx + x1 * y2 - x2 * y1);
    if (d == 0) {
      return 0;
    }
    return (area / d - dist);
  };

  this.gradient = function(out) {
    var x0 = params[TX].get(), x1 = params[LP1X].get(), x2 = params[LP2X].get();
    var y0 = params[TY].get(), y1 = params[LP1Y].get(), y2 = params[LP2Y].get();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d2 = dx * dx + dy * dy;
    var d = Math.sqrt(d2);
    var area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    out[TX]   = ((y1 - y2) / d);
    out[TY]   = ((x2 - x1) / d);
    out[LP1X] = (((y2 - y0) * d + (dx / d) * area) / d2);
    out[LP1Y] = (((x0 - x2) * d + (dy / d) * area) / d2);
    out[LP2X] = (((y0 - y1) * d - (dx / d) * area) / d2);
    out[LP2Y] = (((x1 - x0) * d - (dy / d) * area) / d2);
    out[D] = -1;

    for (var i = 0; i < 6; i++) {
      if (Number.isNaN(out[i])) {
        out[i] = 0;
      }
      if (area < 0) {
        out[i] *= -1;
      }
    }
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
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
    for (var i = 0; i < 4; i++) if (Number.isNaN(out[i])) out[i] = 0;
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
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
    out[D] = -1;
    for (var i = 0; i < 4; i++) if (Number.isNaN(out[i])) out[i] = 0;
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