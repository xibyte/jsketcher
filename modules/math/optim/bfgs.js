//Added strong wolfe condition to numeric's uncmin
import numeric from "numeric";

export function fmin_bfgs(f, x0, tol, gradient, maxit, callback, options) {
  var grad = numeric.gradient;
  if (typeof options === "undefined") {
    options = {};
  }
  if (typeof tol === "undefined") {
    tol = 1e-8;
  }
  if (typeof gradient === "undefined") {
    gradient = function (x) {
      return grad(f, x);
    };
  }
  if (typeof maxit === "undefined") maxit = 1000;
  x0 = numeric.clone(x0);
  var n = x0.length;
  var f0 = f(x0), f1, df0;
  if (isNaN(f0)) throw new Error('uncmin: f(x0) is a NaN!');
  var max = Math.max, norm2 = numeric.norm2;
  tol = max(tol, numeric.epsilon);
  var step, g0, g1, H1 = options.Hinv || numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor,
    div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var it = 0, i, s, x1, y, Hy, Hs, ys, i0, t, nstep, t1, t2;
  var msg = "";
  g0 = gradient(x0);
  while (it < maxit) {
    if (typeof callback === "function") {
      if (callback(it, x0, f0, g0, H1)) {
        msg = "Callback returned true";
        break;
      }
    }
    if (!all(isfinite(g0))) {
      msg = "Gradient has Infinity or NaN";
      break;
    }
    step = neg(dot(H1, g0));
    if (!all(isfinite(step))) {
      msg = "Search direction has Infinity or NaN";
      break;
    }
    nstep = norm2(step);
    if (nstep < tol) {
      msg = "Newton step smaller than tol";
      break;
    }
    t = 1;
    df0 = dot(g0, step);
    // line search
    x1 = x0;
    var tL = 0;
    var tR = 100;
    while (it < maxit) {
      if (t * nstep < tol) {
        break;
      }
      s = mul(step, t);
      x1 = add(x0, s);
      f1 = f(x1);
      //Nocadel, 3.7(a,b)
      if (f1 - f0 >= 0.1 * t * df0 || isNaN(f1)) {
        tR = t;
        t = (tL + tR) * 0.5;
        ++it;
      } else {
        var slope = dot(gradient(x1), step);
        if (slope <= 0.9 * Math.abs(df0)) {
          break;
        } else if (slope >= 0.9 * df0) {
          tR = t;
          t = (tL + tR) * 0.5;
        } else {
          tL = t;
          t = (tL + tR) * 0.5;
        }
      }
    }
    if (t * nstep < tol) {
      msg = "Line search step size smaller than tol";
      break;
    }
    if (it === maxit) {
      msg = "maxit reached during line search";
      break;
    }
    g1 = gradient(x1);
    y = sub(g1, g0);
    ys = dot(y, s);
    Hy = dot(H1, y);

    // BFGS update on H1
    H1 = sub(add(H1,
      mul(
        (ys + dot(y, Hy)) / (ys * ys),
        ten(s, s))),
      div(add(ten(Hy, s), ten(s, Hy)), ys));
    x0 = x1;
    f0 = f1;
    g0 = g1;
    ++it;
  }
  return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations: it, message: msg};
}

var bfgs = function (f, x0, tol, gradient, maxit, callback, options) {
  var grad = numeric.gradient;
  if (typeof options === "undefined") {
    options = {};
  }
  if (typeof tol === "undefined") {
    tol = 1e-8;
  }
  if (typeof gradient === "undefined") {
    gradient = function (x) {
      return grad(f, x);
    };
  }
  if (typeof maxit === "undefined") maxit = 1000;
  x0 = numeric.clone(x0);
  var n = x0.length;
  var f0 = f(x0), f1, df0;
  if (isNaN(f0)) throw new Error('uncmin: f(x0) is a NaN!');
  var max = Math.max, norm2 = numeric.norm2;
  tol = max(tol, numeric.epsilon);
  var step, g0, g1, H1 = options.Hinv || numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor,
    div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var it = 0, i, s, x1, y, Hy, Hs, ys, i0, t, nstep, t1, t2;
  var msg = "";
  g0 = gradient(x0);
  while (it < maxit) {
    if (typeof callback === "function") {
      if (callback(it, x0, f0, g0, H1)) {
        msg = "Callback returned true";
        break;
      }
    }
    if (!all(isfinite(g0))) {
      msg = "Gradient has Infinity or NaN";
      break;
    }
    step = neg(dot(H1, g0));
    if (!all(isfinite(step))) {
      msg = "Search direction has Infinity or NaN";
      break;
    }
    nstep = norm2(step);
    if (nstep < tol) {
      msg = "Newton step smaller than tol";
      break;
    }

    df0 = dot(g0, step);
    // line search
    t1 = 0.0;
    f1 = f0;

    t2 = 1.0;
    s = mul(step, t2);
    x1 = add(x0, s);
    var f2 = f(x1);

    var t3 = 2.0;
    s = mul(step, t3);
    x1 = add(x0, s);
    var f3 = f(x1);
    var tMax = 1e23;

    while ((f2 > f1 || f2 > f3) && it < maxit) {
      if (t * nstep < tol) {
        break;
      }
      if (f2 > f1) {
        //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
        //Effectively both are shortened by a factor of two.
        t3 = t2;
        f3 = f2;
        t2 = t2 / 2;

        s = mul(step, t2);
        x1 = add(x0, s);
        f2 = f(x1);
      } else if (f2 > f3) {
        if (t3 >= tMax)
          break;
        //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
        //Effectively both are lengthened by a factor of two.
        t2 = t3;
        f2 = f3;
        t3 = t3 * 2;

        s = mul(step, t3);
        x1 = add(x0, s);
        f3 = f(x1);
      }
      it++;
    }

    //Get the alpha for the minimum f of the quadratic approximation
    var ts = t2 + ((t2 - t1) * (f1 - f3)) / (3 * (f1 - 2 * f2 + f3));

    //Guarantee that the new alphaStar is within the bracket
    if (ts >= t3 || ts <= t1)
      ts = t2;

    if (ts > tMax)
      ts = tMax;

    if (ts != ts)
      ts = 0.;

    //Take a final step to alphaStar
    s = mul(step, ts);
    x1 = add(x0, s);
    f1 = f(x1);


    if (t * nstep < tol) {
      msg = "Line search step size smaller than tol";
      break;
    }
    if (it === maxit) {
      msg = "maxit reached during line search";
      break;
    }
    g1 = gradient(x1);
    y = sub(g1, g0);
    ys = dot(y, s);
    Hy = dot(H1, y);

    // BFGS update on H1
    H1 = sub(add(H1,
      mul(
        (ys + dot(y, Hy)) / (ys * ys),
        ten(s, s))),
      div(add(ten(Hy, s), ten(s, Hy)), ys));
    x0 = x1;
    f0 = f1;
    g0 = g1;
    ++it;
  }
  return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations: it, message: msg};
};
var bfgs_updater = function (gradient, x0) {
  var n = x0.length;
  var max = Math.max, norm2 = numeric.norm2;
  var g0, g1, H1 = numeric.identity(n);
  var dot = numeric.dot, inv = numeric.inv, sub = numeric.sub, add = numeric.add, ten = numeric.tensor,
    div = numeric.div, mul = numeric.mul;
  var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
  var y, Hy, Hs, ys;
  var msg = "";
  g0 = gradient(x0);

  function step() {
    return neg(dot(H1, g0));
  }

  function update(x, real_step) {
    var s = real_step;

    g1 = gradient(x);
    y = sub(g1, g0);
    ys = dot(y, s);
    Hy = dot(H1, y);

    // BFGS update on H1
    H1 = sub(add(H1,
      mul(
        (ys + dot(y, Hy)) / (ys * ys),
        ten(s, s))),
      div(add(ten(Hy, s), ten(s, Hy)), ys));
    g0 = g1;
  }

  return {step: step, update: update};
};