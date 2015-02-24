optim = {};

//Added strong wolfe condition to numeric's uncmin
optim.bfgs_ = function(f,x0,tol,gradient,maxit,callback,options) {
  var grad = numeric.gradient;
  if(typeof options === "undefined") { options = {}; }
  if(typeof tol === "undefined") { tol = 1e-8; }
  if(typeof gradient === "undefined") { gradient = function(x) { return grad(f,x); }; }
  if(typeof maxit === "undefined") maxit = 1000;
  x0 = numeric.clone(x0);
  var n = x0.length;
  var f0 = f(x0),f1,df0;
  if(isNaN(f0)) throw new Error('uncmin: f(x0) is a NaN!');
  var max = Math.max, norm2 = numeric.norm2;
  tol = max(tol,numeric.epsilon);
  var step,g0,g1,H1 = options.Hinv || numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor, div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var it=0,i,s,x1,y,Hy,Hs,ys,i0,t,nstep,t1,t2;
  var msg = "";
  g0 = gradient(x0);
  while(it<maxit) {
    if(typeof callback === "function") { if(callback(it,x0,f0,g0,H1)) { msg = "Callback returned true"; break; } }
    if(!all(isfinite(g0))) { msg = "Gradient has Infinity or NaN"; break; }
    step = neg(dot(H1,g0));
    if(!all(isfinite(step))) { msg = "Search direction has Infinity or NaN"; break; }
    nstep = norm2(step);
    if(nstep < tol) { msg="Newton step smaller than tol"; break; }
    t = 1;
    df0 = dot(g0,step);
    // line search
    x1 = x0;
    var tL = 0;
    var tR = 100;
    while(it < maxit) {
      if(t*nstep < tol) { break; }
      s = mul(step,t);
      x1 = add(x0,s);
      f1 = f(x1);
      //Nocadel, 3.7(a,b)
      if(f1-f0 >= 0.1*t*df0 || isNaN(f1)) {
        tR = t;
        t = (tL + tR) * 0.5;
        ++it;
        continue;
      } else {
        var slope = dot(gradient(x1), step);
        if (slope <= 0.9 * Math.abs(df0)){
          break;
        }else if ( slope >= 0.9 * df0) {
          tR = t;
          t = (tL+ tR) * 0.5;
          continue;
        }else{
          tL = t;
          t = (tL+ tR)*0.5;
          continue;
        }
      }
      break;
    }
    if(t*nstep < tol) { msg = "Line search step size smaller than tol"; break; }
    if(it === maxit) { msg = "maxit reached during line search"; break; }
    g1 = gradient(x1);
    y = sub(g1,g0);
    ys = dot(y,s);
    Hy = dot(H1,y);

    // BFGS update on H1
    H1 = sub(add(H1,
            mul(
                    (ys+dot(y,Hy))/(ys*ys),
                ten(s,s)    )),
        div(add(ten(Hy,s),ten(s,Hy)),ys));
    x0 = x1;
    f0 = f1;
    g0 = g1;
    ++it;
  }
  return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations:it, message: msg};
};


optim.bfgs = function(f,x0,tol,gradient,maxit,callback,options) {
  var grad = numeric.gradient;
  if(typeof options === "undefined") { options = {}; }
  if(typeof tol === "undefined") { tol = 1e-8; }
  if(typeof gradient === "undefined") { gradient = function(x) { return grad(f,x); }; }
  if(typeof maxit === "undefined") maxit = 1000;
  x0 = numeric.clone(x0);
  var n = x0.length;
  var f0 = f(x0),f1,df0;
  if(isNaN(f0)) throw new Error('uncmin: f(x0) is a NaN!');
  var max = Math.max, norm2 = numeric.norm2;
  tol = max(tol,numeric.epsilon);
  var step,g0,g1,H1 = options.Hinv || numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor, div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var it=0,i,s,x1,y,Hy,Hs,ys,i0,t,nstep,t1,t2;
  var msg = "";
  g0 = gradient(x0);
  while(it<maxit) {
    if(typeof callback === "function") { if(callback(it,x0,f0,g0,H1)) { msg = "Callback returned true"; break; } }
    if(!all(isfinite(g0))) { msg = "Gradient has Infinity or NaN"; break; }
    step = neg(dot(H1,g0));
    if(!all(isfinite(step))) { msg = "Search direction has Infinity or NaN"; break; }
    nstep = norm2(step);
    if(nstep < tol) { msg="Newton step smaller than tol"; break; }

    df0 = dot(g0,step);
    // line search
    t1 = 0.0;
    f1 = f0;

    t2 = 1.0;
    s = mul(step,t2);
    x1 = add(x0,s);
    var f2 = f(x1);

    t3 = 2.0;
    s = mul(step,t3);
    x1 = add(x0,s);
    var f3 = f(x1);
    var tMax = 1e23;

    while( (f2 > f1 || f2 > f3) && it < maxit) {
      if(t*nstep < tol) { break; }
      if (f2 > f1) {
        //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
        //Effectively both are shortened by a factor of two.
        t3 = t2;
        f3 = f2;
        t2 = t2 / 2;

        s = mul(step,t2);
        x1 = add(x0,s);
        f2 = f(x1);
      }
      else if (f2 > f3) {
        if (t3 >= tMax)
            break;
        //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
        //Effectively both are lengthened by a factor of two.
        t2 = t3;
        f2 = f3;
        t3 = t3 * 2;

        s = mul(step,t3);
        x1 = add(x0,s);
        f3 = f(x1);
      }
      it ++;
    }

    //Get the alpha for the minimum f of the quadratic approximation
    var ts = t2 + ((t2-t1)*(f1-f3))/(3*(f1-2*f2+f3));

    //Guarantee that the new alphaStar is within the bracket
    if (ts >= t3 || ts <= t1)
        ts = t2;

    if (ts > tMax)
        ts = tMax;

    if (ts != ts)
        ts = 0.;

    //Take a final step to alphaStar
    s = mul(step,ts);
    x1 = add(x0,s);
    f1 = f(x1);


    if(t*nstep < tol) { msg = "Line search step size smaller than tol"; break; }
    if(it === maxit) { msg = "maxit reached during line search"; break; }
    g1 = gradient(x1);
    y = sub(g1,g0);
    ys = dot(y,s);
    Hy = dot(H1,y);

    // BFGS update on H1
    H1 = sub(add(H1,
            mul(
                    (ys+dot(y,Hy))/(ys*ys),
                ten(s,s)    )),
        div(add(ten(Hy,s),ten(s,Hy)),ys));
    x0 = x1;
    f0 = f1;
    g0 = g1;
    ++it;
  }
  return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations:it, message: msg};
};

optim.bfgs_updater = function(gradient, x0) {
  var n = x0.length;
  var max = Math.max, norm2 = numeric.norm2;
  var g0,g1,H1 = numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor, div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var y,Hy,Hs,ys;
  var msg = "";
  var g0 = gradient(x0);

  function step() {
    return neg(dot(H1,g0));
  }

  function update(x, real_step) {
    var s = real_step;

    g1 = gradient(x);
    y = sub(g1,g0);
    ys = dot(y,s);
    Hy = dot(H1,y);

    // BFGS update on H1
    H1 = sub(add(H1,
            mul(
                    (ys+dot(y,Hy))/(ys*ys),
                ten(s,s)    )),
        div(add(ten(Hy,s),ten(s,Hy)),ys));
    g0 = g1;
  }
  return {step:step, update:update};
};

optim.inv = function inv(x) {
    var s = numeric.dim(x), abs = Math.abs, m = s[0], n = s[1];
    var A = numeric.clone(x), Ai, Aj;
    var I = numeric.identity(m), Ii, Ij;
    var i,j,k,x;
    for(j=0;j<n;++j) {
        var i0 = -1;
        var v0 = -1;
        for(i=j;i!==m;++i) { k = abs(A[i][j]); if(k>v0) { i0 = i; v0 = k; } }
        Aj = A[i0]; A[i0] = A[j]; A[j] = Aj;
        Ij = I[i0]; I[i0] = I[j]; I[j] = Ij;
        x = Aj[j];
        if (x === 0) {
          //console.log("CAN' INVERSE MATRIX");
          x = 1e-32
        }
        for(k=j;k!==n;++k)    Aj[k] /= x;
        for(k=n-1;k!==-1;--k) Ij[k] /= x;
        for(i=m-1;i!==-1;--i) {
            if(i!==j) {
                Ai = A[i];
                Ii = I[i];
                x = Ai[j];
                for(k=j+1;k!==n;++k)  Ai[k] -= Aj[k]*x;
                for(k=n-1;k>0;--k) { Ii[k] -= Ij[k]*x; --k; Ii[k] -= Ij[k]*x; }
                if(k===0) Ii[0] -= Ij[0]*x;
            }
        }
    }
    return I;
}

// this is Gauss-Newton least square algorithm with trust region(dog leg) control/
optim.dog_leg = function(subsys, rough) {

  var tolg=1e-80, tolx=1e-80, tolf=1e-10;

  var xsize = subsys.params.length;
  var csize = subsys.constraints.length;

  if (xsize == 0)
      return 'Success';

  var vec = TCAD.math._arr;
  var mx = TCAD.math._matrix;

  var n = numeric;

  var x = vec(xsize);
  var x_new = vec(xsize);

  var fx = vec(csize);
  var fx_new = vec(csize);

  var Jx = mx(csize, xsize);
  var Jx_new = mx(csize, xsize);
  var g = vec(xsize);
  var h_sd = vec(xsize);
  var h_gn = vec(xsize);
  var h_dl = vec(xsize);

  var r0 = vec(csize);
  
  var err;
  subsys.fillParams(x);
  
//  subsys.setParams(vec(xsize));
//  subsys.calcResidual(r0);
  
  subsys.setParams(x);
  err = subsys.calcResidual(fx);
  
  subsys.fillJacobian(Jx);

  function lls(A, b) {
    var At = n.transpose(A);
    var J = n.dot(At, A);
    var r = n.dot(At, b);;

    return nocadel_10_18(J, r);
  }

  function nocadel_10_18(A, r) {
    //10.18
    var usv = n.svd(A);
    var x = vec(xsize);
    for (var i = 0; i < usv.S.length; ++i) {
      var u = usv.U[i];
      var v = usv.V[i];
      var b = usv.S[i];
      if (b != 0) {
        var _t = n.mul(v, n.dot(u, r) / b);
        x = n.add(x, _t);
      }
    }
    return x;
  }

  function lsolve(A, b) {
//    if (csize < xsize) {
//      var At = n.transpose(A);
//      var J = n.dot(At, A);
//      var r = n.dot(At, b);;
//      return n.solve(J, r);
//    } else {
//      return n.solve(A, b);
//    }
    var At = n.transpose(A);
    var res = n.dot(n.dot(At, optim.inv(n.dot(A, At)) ), b);
    return res;

  }

  function lusolve(A, b) {
    var At = n.transpose(A);
    var A = n.dot(At, A);
    var b = n.dot(At, b);
    return n.solve(A, b, true);
  }

  g = n.dot(n.transpose(Jx), n.mul(fx, -1));

  // get the infinity norm fx_inf and g_inf
  var g_inf = n.norminf(g);
  var fx_inf = n.norminf(fx);

  var maxIterNumber = 100 * xsize;
  var divergingLim = 1e6*err + 1e12;

  var delta=0.1;
  var alpha=0.;
  var nu=2.;
  var iter=0, stop=0, reduce=0;
  while (stop === 0) {

      // check if finished
      if (fx_inf <= tolf || (rough && err <= tolf)) // Success
          stop = 1;
      else if (g_inf <= tolg)
          stop = 2;
      else if (delta <= tolx*(tolx + n.norm2(x)))
          stop = 2;
      else if (iter >= maxIterNumber)
          stop = 4;
      else if (err > divergingLim || err != err) { // check for diverging and NaN
          stop = 6;
      }
      else {
          // get the steepest descent direction
          alpha = n.norm2Squared(g)/n.norm2Squared(n.dot(Jx, g));
          h_sd  = n.mul(g, alpha);

          // get the gauss-newton step
          //h_gn = n.solve(Jx, n.mul(fx, -1));
          h_gn = lsolve(Jx, n.mul(fx, -1));

          //LU-Decomposition
//          h_gn = lusolve(Jx, n.mul(fx, -1));

          //Conjugate gradient method
          //h_gn = optim.cg(Jx, h_gn, n.mul(fx, -1), 1e-8, maxIterNumber);
        
          //solve linear problem using svd formula to get the gauss-newton step
          //h_gn = lls(Jx, n.mul(fx, -1));
        
          var rel_error = n.norm2(n.add(n.dot(Jx, h_gn), fx)) / n.norm2(fx);
          if (rel_error > 1e15)
              break;

          // compute the dogleg step
          if (n.norm2(h_gn) < delta) {
              h_dl = n.clone(h_gn);
              if  (n.norm2(h_dl) <= tolx*(tolx + n.norm2(x))) {
                  stop = 5;
                  break;
              }
          }
          else if (alpha*n.norm2(g) >= delta) {
              h_dl = n.mul( h_sd, delta/(alpha*n.norm2(g)));
          }
          else {
              //compute beta
              var beta = 0;
              var b = n.sub(h_gn, h_sd);
              var bb = Math.abs(n.dot(b, b));
              var gb = Math.abs(n.dot(h_sd,b));
              var c = (delta + n.norm2(h_sd))*(delta - n.norm2(h_sd));

              if (gb > 0)
                  beta = c / (gb + Math.sqrt(gb * gb + c * bb));
              else
                  beta = (Math.sqrt(gb * gb + c * bb) - gb)/bb;

              // and update h_dl and dL with beta
              h_dl = n.add(h_sd, n.mul(beta,b));
          }
      }

      // see if we are already finished
      if (stop)
          break;

      // get the new values
      var err_new;
      x_new = n.add(x, h_dl);
      subsys.setParams(x_new);
      err_new = subsys.calcResidual(fx_new);
      subsys.fillJacobian(Jx_new);

      // calculate the linear model and the update ratio
      var dL = err - 0.5* n.norm2Squared(n.add(fx, n.dot(Jx, h_dl)));
      var dF = err - err_new;
      var rho = dL/dF;

      if (dF > 0 && dL > 0) {
          x  = n.clone(x_new);
          Jx = n.clone(Jx_new);
          fx = n.clone(fx_new);
          err = err_new;

          g = n.dot(n.transpose(Jx), n.mul(fx, -1));

          // get infinity norms
          g_inf = n.norminf(g);
          fx_inf = n.norminf(fx);
      }
      else
          rho = -1;

      // update delta
      if (Math.abs(rho-1.) < 0.2 && n.norm2(h_dl) > delta/3. && reduce <= 0) {
          delta = 3*delta;
          nu = 2;
          reduce = 0;
      }
      else if (rho < 0.25) {
          delta = delta/nu;
          nu = 2*nu;
          reduce = 2;
      }
      else
          reduce--;

      // count this iteration and start again
      iter++;
  }

  return {
    evalCount : iter,
    error : err,
    returnCode : stop
  };

};

optim.cg = function(A, x, b, tol, maxIt) {

  var _ = numeric;

  var tr = _.transpose;
  var At = tr(A);
  if (A.length != A[0].length) {
    var A = _.dot(At, A);
    var b = _.dot(At, b);
    At = tr(A);
  }

  var r = _.sub(_.dot(A, x), b);
  var p = _.mul(r, -1);
  var rr = _.dotVV(r, r);

  var a;
  var _rr;
  var beta;

  for (var i = 0; i < maxIt; ++i) {
    if (_.norm2(r) <= tol) break;
    var Axp =_.dot(A, p);
    a = rr / _.dotVV(Axp, p);
    x = _.add(x, _.mul(p, a));
    r = _.add(r, _.mul(Axp, a));
    _rr = rr;
    rr = _.dotVV(r, r);
    beta = rr / _rr;
    p = _.add(_.mul(r, -1), _.mul(p, beta));
  }
//  console.log("liner problem solved in " + i);
  return x;
};