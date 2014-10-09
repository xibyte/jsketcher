TCAD.parametric = {};

TCAD.parametric.Param = function(id, value) {
  this.id = id;
  this.value = value;
  this.j = -1;
};

TCAD.parametric.Param.prototype.set = function(value) {
  this.value = value;
};

TCAD.parametric.Param.prototype.get = function(value) {
  return this.value;
};


TCAD.parametric.System = function(constraints) {
  this.constraints = constraints;
  this.params = [];
  for (var ci = 0; ci < constraints.length; ++ci) {
    var c = constraints[ci];
    for (var pi = 0; pi < c.params.length; ++pi) {
      var p = c.params[pi];
      if (p.j == -1) {
        p.j = this.params.length;
        this.params.push(p);
      }
    }
  }
};


TCAD.parametric.System.prototype.makeJacobian = function() {
  var jacobi = [];
  for (var i=0; i < this.constraints.length; i++) {
    jacobi[i] = [];
    for (var j=0; j < this.params.length; j++) {
      jacobi[i][j] = 0;
    }
  }
  for (var i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];

    var cParams = c.params;
    var grad = [];
    c.gradient(grad);

    for (var p = 0; p < cParams.length; p++) {
      var param = cParams[p];
      var j = param.j;
      jacobi[i][j] = grad[p];
    }
  }
  return jacobi;
};

TCAD.parametric.System.prototype.getParams = function() {
  var out = [];
  for (var p = 0; p < this.params.length; p++) {
    out[p] = this.params[p].get();
  }
  return out;
};

TCAD.parametric.System.prototype.setParams = function(point) {
  for (var p = 0; p < this.params.length; p++) {
    this.params[p].set(point[p]);
  }
};

TCAD.parametric.System.prototype.getValues = function() {
  var values = [];
  for (var i=0; i < this.constraints.length; i++) {
    values[i] = this.constraints[i].error();
  }
  return values;
};

TCAD.parametric.solve = function(constrs, locked, fineLevel) {

  if (constrs.length == 0) return;

  for (var i = 0; i < locked.length; ++i) {
    constrs.push(new TCAD.constraints.EqualsTo([locked[i]], locked[i].get()));
  }

  var sys = new TCAD.parametric.System(constrs);

  if (sys.params.length == 0) return;

  function arr(size) {
    var out = [];
    out.length = size;
    for (var i = 0; i < size; ++i) {
        out[i] = 0;
    }
    return out;
  }

  var model = function(point) {
    sys.setParams(point);
    return sys.getValues();
  };

  var jacobian = function(point) {
    sys.setParams(point);
    return sys.makeJacobian();
  };

  var opt = new LMOptimizer(sys.getParams(), arr(sys.constraints.length), model, jacobian);

  switch (fineLevel) {
    case 1:
      eps = 0.01;
      opt.init0(eps, eps, eps);
      break;
    case 2:
      eps = 0.1;
      opt.init0(eps, eps, eps);
      break;
    default:
      eps = 0.00000001;
      opt.init0(eps, eps, eps);
  }

  var res = opt.doOptimize();
  sys.setParams(res[0]);
};
