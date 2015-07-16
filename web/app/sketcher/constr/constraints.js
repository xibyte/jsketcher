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

TCAD.constraints.Weighted = function(constr, weight) {

  this.params = constr.params;
   
  this.error = function() {
    return constr.error() * weight;
  };

  this.gradient = function(out) {
    constr.gradient(out);
    for (var i = 0; i < out.length; i++) {
      out[i] *= weight;
    }
  }
};


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

TCAD.constraints.P2LDistance = function(params, distance) {

  this.params = params;
  this.distance = distance;

  this.tx = 0;
  this.ty = 1;
  this.lp1x = 2;
  this.lp1y = 3;
  this.lp2x = 4;
  this.lp2y = 5;

  this.error = function() {
    var x0 = this.p0x(), x1 = this.p1x(), x2 = this.p2x();
    var y0 = this.p0y(), y1 = this.p1y(), y2 = this.p2y();
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

  this.p1x = function() {
    return params[this.lp1x].get();
  };

  this.p1y = function() {
    return params[this.lp1y].get();
  };

  this.p2x = function() {
    return params[this.lp2x].get();
  };

  this.p2y = function() {
    return params[this.lp2y].get();
  };

  this.p0x = function() {
    return params[this.tx].get();
  };

  this.p0y = function() {
    return params[this.ty].get();
  };


  this.gradient = function(out) {
    var x0 = this.p0x(), x1 = this.p1x(), x2 = this.p2x();
    var y0 = this.p0y(), y1 = this.p1y(), y2 = this.p2y();
    var dx = x2 - x1;
    var dy = y2 - y1;
    var d2 = dx * dx + dy * dy;
    var d = Math.sqrt(d2);
    var area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    out[this.tx]   = ((y1 - y2) / d);
    out[this.ty]   = ((x2 - x1) / d);
    out[this.lp1x] = (((y2 - y0) * d + (dx / d) * area) / d2);
    out[this.lp1y] = (((x0 - x2) * d + (dy / d) * area) / d2);
    out[this.lp2x] = (((y0 - y1) * d - (dx / d) * area) / d2);
    out[this.lp2y] = (((x1 - x0) * d - (dy / d) * area) / d2);

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
    var x0 = this.p0x(), x1 = this.p1x(), x2 = this.p2x();
    var y0 = this.p0y(), y1 = this.p1y(), y2 = this.p2y();
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

  this.p1x = function() {
    return params[LP1X].get();
  };

  this.p1y = function() {
    return params[LP1Y].get();
  };

  this.p2x = function() {
    return params[LP2X].get();
  };

  this.p2y = function() {
    return params[LP2Y].get();
  };

  this.p0x = function() {
    return params[TX].get();
  };

  this.p0y = function() {
    return params[TY].get();
  };

  this.gradient = function(out) {
    var x0 = this.p0x(), x1 = this.p1x(), x2 = this.p2x();
    var y0 = this.p0y(), y1 = this.p1y(), y2 = this.p2y();
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

TCAD.constraints.P2PDistance = function(params, distance) {

  this.params = params;
  this.distance = distance;

  this.p1x = 0;
  this.p1y = 1;
  this.p2x = 2;
  this.p2y = 3;

  this.get = function(i) {
    return this.params[i].get();
  };

  this.error = function() {
    var dx = this.get(this.p1x) - this.get(this.p2x);
    var dy = this.get(this.p1y) - this.get(this.p2y);
    var d = Math.sqrt(dx * dx + dy * dy);
    return (d - this.distance);
  };

  this.gradient = function(out) {

    var dx = this.get(this.p1x) - this.get(this.p2x);
    var dy = this.get(this.p1y) - this.get(this.p2y);
    var d = Math.sqrt(dx * dx + dy * dy);
    out[this.p1x] = dx / d;
    out[this.p1y] = dy / d;
    out[this.p2x] = -dx / d;
    out[this.p2y] = -dy / d;
  }

};


TCAD.constraints.P2PDistanceV = function(params) {

  this.params = params;


  this.p1x = 0;
  this.p1y = 1;
  this.p2x = 2;
  this.p2y = 3;
  this.d = 4;

  this.get = function(i) {
    return this.params[i].get();
  };

  this.error = function() {
    var dx = this.get(this.p1x) - this.get(this.p2x);
    var dy = this.get(this.p1y) - this.get(this.p2y);
    var d = Math.sqrt(dx * dx + dy * dy);
    return (d - this.get(this.d));
  };

  this.gradient = function(out) {

    var dx = this.get(this.p1x) - this.get(this.p2x);
    var dy = this.get(this.p1y) - this.get(this.p2y);
    var d = Math.sqrt(dx * dx + dy * dy);
    out[this.p1x] = dx / d;
    out[this.p1y] = dy / d;
    out[this.p2x] = -dx / d;
    out[this.p2y] = -dy / d;
    out[this.d] = -1;
  }

};


TCAD.constraints.Parallel = function(params) {

  this.params = params;

  this.l1p1x = 0;
  this.l1p1y = 1;
  this.l1p2x = 2;
  this.l1p2y = 3;
  this.l2p1x = 4;
  this.l2p1y = 5;
  this.l2p2x = 6;
  this.l2p2y = 7;
  
  this.error = function() {
    var dx1 = (this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
    var dy1 = (this.params[this.l1p1y].get() - this.params[this.l1p2y].get());
    var dx2 = (this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    var dy2 = (this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    return (dx1*dy2 - dy1*dx2);
  };

  this.gradient = function(out) {
    out[this.l1p1x] =  (this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    out[this.l1p2x] = -(this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    out[this.l1p1y] = -(this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    out[this.l1p2y] =  (this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    out[this.l2p1x] = -(this.params[this.l1p1y].get() - this.params[this.l1p2y].get());
    out[this.l2p2x] =  (this.params[this.l1p1y].get() - this.params[this.l1p2y].get());
    out[this.l2p1y] =  (this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
    out[this.l2p2y] = -(this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
  }
};

TCAD.constraints.Perpendicular = function(params) {

  this.params = params;

  this.l1p1x = 0;
  this.l1p1y = 1;
  this.l1p2x = 2;
  this.l1p2y = 3;
  this.l2p1x = 4;
  this.l2p1y = 5;
  this.l2p2x = 6;
  this.l2p2y = 7;

  this.error = function() {
    var dx1 = (this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
    var dy1 = (this.params[this.l1p1y].get() - this.params[this.l1p2y].get());
    var dx2 = (this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    var dy2 = (this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    //dot product shows how the lines off to be perpendicular
    return (dx1*dx2 + dy1*dy2);
  };

  this.gradient = function(out) {

    out[this.l1p1x] =  (this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    out[this.l1p2x] = -(this.params[this.l2p1x].get() - this.params[this.l2p2x].get());
    out[this.l1p1y] =  (this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    out[this.l1p2y] = -(this.params[this.l2p1y].get() - this.params[this.l2p2y].get());
    out[this.l2p1x] =  (this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
    out[this.l2p2x] = -(this.params[this.l1p1x].get() - this.params[this.l1p2x].get());
    out[this.l2p1y] =  (this.params[this.l1p1y].get() - this.params[this.l1p2y].get());
    out[this.l2p2y] = -(this.params[this.l1p1y].get() - this.params[this.l1p2y].get());

  }

};