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
  for (let ci = 0; ci < constraints.length; ++ci) {
    let c = constraints[ci];
    for (let pi = 0; pi < c.params.length; ++pi) {
      let p = c.params[pi];
      if (p.j == -1) {
        p.j = this.params.length;
        this.params.push(p);
      }
    }
  }
}


System.prototype.makeJacobian = function() {
  let jacobi = [];
  let i;
  let j;
  for (i=0; i < this.constraints.length; i++) {
    jacobi[i] = [];
    for (j=0; j < this.params.length; j++) {
      jacobi[i][j] = 0;
    }
  }
  for (i=0; i < this.constraints.length; i++) {
    let c = this.constraints[i];

    let cParams = c.params;
    let grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (let p = 0; p < cParams.length; p++) {
      let param = cParams[p];
      j = param.j;
      jacobi[i][j] = grad[p];
    }
  }
  return jacobi;
};

System.prototype.fillJacobian = function(jacobi) {
  for (let i=0; i < this.constraints.length; i++) {
    let c = this.constraints[i];

    let cParams = c.params;
    let grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (let p = 0; p < cParams.length; p++) {
      let param = cParams[p];
      let j = param.j;
      jacobi[i][j] = grad[p];
    }
  }
  return jacobi;
};

System.prototype.calcResidual = function(r) {

  let i=0;
  let err = 0.;

  for (i=0; i < this.constraints.length; i++) {
    let c = this.constraints[i];
    r[i] = c.error();
    err += r[i]*r[i];
  }

  err *= 0.5;
  return err;
};

System.prototype.calcGrad_ = function(out) {
  let i;
  for (i = 0; i < out.length || i < this.params.length; ++i) {
    out[i][0] = 0;
  }

  for (i=0; i < this.constraints.length; i++) {
    let c = this.constraints[i];

    let cParams = c.params;
    let grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (let p = 0; p < cParams.length; p++) {
      let param = cParams[p];
      let j = param.j;
      out[j][0] += this.constraints[i].error() * grad[p]; // (10.4)
    }
  }
};

System.prototype.calcGrad = function(out) {
  let i;
  for (i = 0; i < out.length || i < this.params.length;  ++i) {
    out[i] = 0;
  }

  for (i=0; i < this.constraints.length; i++) {
    let c = this.constraints[i];

    let cParams = c.params;
    let grad = [];
    fillArray(grad, 0, cParams.length, 0);
    c.gradient(grad);

    for (let p = 0; p < cParams.length; p++) {
      let param = cParams[p];
      let j = param.j;
      out[j] += this.constraints[i].error() * grad[p]; // (10.4) 
    }
  }
};

System.prototype.fillParams = function(out) {
  for (let p = 0; p < this.params.length; p++) {
    out[p] = this.params[p].get();
  }
};

System.prototype.getParams = function() {
  let out = [];
  this.fillParams(out);
  return out;
};

System.prototype.setParams = function(point) {
  for (let p = 0; p < this.params.length; p++) {
    this.params[p].set(point[p]);
  }
};

System.prototype.error = function() {
  let error = 0;
  for (let i=0; i < this.constraints.length; i++) {
    error += Math.abs(this.constraints[i].error());
  }
  return error;
};

System.prototype.errorSquare = function() {
  let error = 0;
  for (let i=0; i < this.constraints.length; i++) {
    let t = this.constraints[i].error();
    error += t * t;
  }
  return error * 0.5;
};

System.prototype.getValues = function() {
  let values = [];
  for (let i=0; i < this.constraints.length; i++) {
    values[i] = this.constraints[i].error();
  }
  return values;
};

System.prototype.rollback = function() {
  for (let p = 0; p < this.params.length; p++) {
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

let lock2Equals2 = function(constrs, locked) {
  let _locked = [];
  for (let i = 0; i < locked.length; ++i) {
    _locked.push(new EqualsTo([locked[i]], locked[i].get()));
  }
  return _locked;
};

let diagnose = function(sys) {
  if (sys.constraints.length === 0 || sys.params.length === 0) {
    return {
      conflict : false,
      dof : 0
    }
  }
  let jacobian = sys.makeJacobian();
  let qr = new QR(jacobian);
  return {
    conflict : sys.constraints.length > qr.rank,
    dof : sys.params.length - qr.rank
  }
};

let prepare = function(constrs, locked) {

  let simpleMode = true;
  let lockingConstrs;
  if (!simpleMode) {
    lockingConstrs = lock2Equals2(constrs, locked);
    Array.prototype.push.apply( constrs, lockingConstrs );
  }

  constrs = wrapConstants(constrs);
  let sys = new System(constrs);
  
  let model = function(point) {
    sys.setParams(point);
    return sys.getValues();
  };

  let jacobian = function(point) {
    sys.setParams(point);
    return sys.makeJacobian();
  };
  let nullResult = {
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
  let systemSolver = {
    diagnose : function() {return diagnose(sys)},
    error : function() {return sys.error()},
    solveSystem : solve,
    system : sys,
    updateLock : function(values) {
      for (let i = 0; i < values.length; ++i) {
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

let solve_lm = function(sys, model, jacobian, rough) {
  let opt = new LMOptimizer(sys.getParams(), newVector(sys.constraints.length), model, jacobian);
  opt.evalMaximalCount = 100000; //100 * sys.params.length;
  let eps = rough ? 0.001 : 0.00000001;
  opt.init0(eps, eps, eps);
  let returnCode = 1;
  let res;
  try {
    res = opt.doOptimize();
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