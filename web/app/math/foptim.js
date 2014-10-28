// this is Gauss-Newton least square algorithm with trust region(dog leg) control/
//
optim.dog_leg = function(subsys) {

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

  err = subsys.calcResidual(fx);
  subsys.fillJacobian(Jx);

  function lsolve(A, b) {
    var At = n.transpose(A);
    var res = n.dot(n.dot(At, n.inv(n.dot(A, At)) ), b);
    return res;

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
  while (!stop) {

      // check if finished
      if (fx_inf <= tolf) // Success
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
//          h_gn = n.solve(Jx, n.mul(fx, -1));
          h_gn = lsolve(Jx, n.mul(fx, -1));

//          solve linear problem using svd formula to get the gauss-newton step
//          h_gn = lls(Jx, n.mul(fx, -1));

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

// it didn't work in some tests
//        // restrict h_dl according to maxStep
//        double scale = subsys->maxStep(h_dl);
//        if (scale < 1.)
//            h_dl *= scale;

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


  return (stop == 1) ? 'Success' : 'Failed';

};

