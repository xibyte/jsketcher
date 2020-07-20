import QR from 'math/qr'
import LMOptimizer from 'math/optim/lm'
import {ConstantWrapper, EqualsTo} from './solverConstraints'
import {dog_leg} from 'math/optim/dogleg'
import {newVector} from 'math/vec';
import {fillArray} from "gems/iterables";


/** @constructor */
function System(constraints) {
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
}


System.prototype.makeJacobian = function() {
  var jacobi = [];
  var i;
  var j;
  for (i=0; i < this.constraints.length; i++) {
    jacobi[i] = [];
    for (j=0; j < this.params.length; j++) {
      jacobi[i][j] = 0;
    }
  }
  for (i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];

    var cParams = c.params;
    var grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (var p = 0; p < cParams.length; p++) {
      var param = cParams[p];
      j = param.j;
      jacobi[i][j] = grad[p];
    }
  }
  return jacobi;
};

System.prototype.fillJacobian = function(jacobi) {
  for (var i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];

    var cParams = c.params;
    var grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (var p = 0; p < cParams.length; p++) {
      var param = cParams[p];
      var j = param.j;
      jacobi[i][j] = grad[p];
    }
  }
  return jacobi;
};

System.prototype.calcResidual = function(r) {

  var i=0;
  var err = 0.;

  for (i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];
    r[i] = c.error();
    err += r[i]*r[i];
  }

  err *= 0.5;
  return err;
};

System.prototype.calcGrad_ = function(out) {
  var i;
  for (i = 0; i < out.length || i < this.params.length; ++i) {
    out[i][0] = 0;
  }

  for (i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];

    var cParams = c.params;
    var grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (var p = 0; p < cParams.length; p++) {
      var param = cParams[p];
      var j = param.j;
      out[j][0] += this.constraints[i].error() * grad[p]; // (10.4)
    }
  }
};

System.prototype.calcGrad = function(out) {
  var i;
  for (i = 0; i < out.length || i < this.params.length;  ++i) {
    out[i] = 0;
  }

  for (i=0; i < this.constraints.length; i++) {
    var c = this.constraints[i];

    var cParams = c.params;
    var grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (var p = 0; p < cParams.length; p++) {
      var param = cParams[p];
      var j = param.j;
      out[j] += this.constraints[i].error() * grad[p]; // (10.4) 
    }
  }
};

System.prototype.fillParams = function(out) {
  for (var p = 0; p < this.params.length; p++) {
    out[p] = this.params[p].get();
  }
};

System.prototype.getParams = function() {
  var out = [];
  this.fillParams(out);
  return out;
};

System.prototype.setParams = function(point) {
  for (var p = 0; p < this.params.length; p++) {
    this.params[p].set(point[p]);
  }
};

System.prototype.error = function() {
  var error = 0;
  for (var i=0; i < this.constraints.length; i++) {
    error += Math.abs(this.constraints[i].error());
  }
  return error;
};

System.prototype.errorSquare = function() {
  var error = 0;
  for (var i=0; i < this.constraints.length; i++) {
    var t = this.constraints[i].error();
    error += t * t;
  }
  return error * 0.5;
};

System.prototype.getValues = function() {
  var values = [];
  for (var i=0; i < this.constraints.length; i++) {
    values[i] = this.constraints[i].error();
  }
  return values;
};

System.prototype.rollback = function() {
  for (var p = 0; p < this.params.length; p++) {
    this.params[p].rollback();
  }
};

function wrapConstants(constrs) {
  for (let i = 0; i < constrs.length; i++) {
    const c = constrs[i];
    const mask = [];
    let needWrap = false;
    for (let j = 0; j < c.params.length; j++) {
      const param = c.params[j];
      mask[j] = param.constant === true;
      needWrap = needWrap || mask[j];
    }
    if (needWrap) {
      constrs[i] = new ConstantWrapper(c, mask);
    }
  }
  for (let constr of constrs) {
    if (constr.params.length === 0) {
      return constrs.filter(c => c.params.length !== 0);
    }
  }
  return constrs;
}

var lock2Equals2 = function(constrs, locked) {
  var _locked = [];
  for (var i = 0; i < locked.length; ++i) {
    _locked.push(new EqualsTo([locked[i]], locked[i].get()));
  }
  return _locked;
};

var diagnose = function(sys) {
  if (sys.constraints.length === 0 || sys.params.length === 0) {
    return {
      conflict : false,
      dof : 0
    }
  }
  var jacobian = sys.makeJacobian();
  var qr = new QR(jacobian);
  return {
    conflict : sys.constraints.length > qr.rank,
    dof : sys.params.length - qr.rank
  }
};

var prepare = function(constrs, locked) {

  var simpleMode = true;
  if (!simpleMode) {
    var lockingConstrs = lock2Equals2(constrs, locked);
    Array.prototype.push.apply( constrs, lockingConstrs );
  }

  constrs = wrapConstants(constrs);
  var sys = new System(constrs);
  
  var model = function(point) {
    sys.setParams(point);
    return sys.getValues();
  };

  var jacobian = function(point) {
    sys.setParams(point);
    return sys.makeJacobian();
  };
  var nullResult = {
    evalCount : 0,
    error : 0,
    returnCode : 1
  };

  function solve(rough, alg) {
    //if (simpleMode) return nullResult;
    if (constrs.length === 0) return nullResult;
    if (sys.params.length === 0) return nullResult;
    // return solve_lm(sys, model, jacobian, rough);

    let result = dog_leg(sys, rough);
    if (!result.success) {
      console.log('dog leg failed, giving levenberg marquardt a shot');
      sys.rollback();
      result = solve_lm(sys, model, jacobian, rough)
    }
    return result;
  }
  var systemSolver = {
    diagnose : function() {return diagnose(sys)},
    error : function() {return sys.error()},
    solveSystem : solve,
    system : sys,
    updateLock : function(values) {
      for (var i = 0; i < values.length; ++i) {
        if (simpleMode) {
          locked[i].set(values[i]);
        } else {
          lockingConstrs[i].value = values[i];
        }
      }
    }
  };
  return systemSolver;
};

var solve_lm = function(sys, model, jacobian, rough) {
  var opt = new LMOptimizer(sys.getParams(), newVector(sys.constraints.length), model, jacobian);
  opt.evalMaximalCount = 100000; //100 * sys.params.length;
  var eps = rough ? 0.001 : 0.00000001;
  opt.init0(eps, eps, eps);
  var returnCode = 1;
  try {
    var res = opt.doOptimize();
  } catch (e) {
    returnCode = 2;
  }
  if (returnCode === 1) {
    sys.setParams(res[0]);
  }
  // console.log("LM result: ")
  // console.log({
  //   evalCount : opt.evalCount,
  //   error : sys.error(),
  // });

  return {
    evalCount : opt.evalCount,
    error : sys.error(),
    success: returnCode === 1 && sys.error() < 1e-3,
    returnCode : returnCode
  };
};

export {prepare}