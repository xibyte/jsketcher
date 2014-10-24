numeric.grdec = function uncmin(f,x0,tol,gradient,maxit,callback,options) {
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
    while(it < maxit) {
      if(t*nstep < tol) { break; }
      s = mul(step,t);
      x1 = add(x0,s);
      f1 = f(x1);
      if(f1-f0 >= 0.1*t*df0 || isNaN(f1)) {
        t *= 0.5;
        ++it;
        continue;
      }
      break;
    }
    if(t*nstep < tol) { msg = "Line search step size smaller than tol"; break; }
    if(it === maxit) { msg = "maxit reached during line search"; break; }
    g1 = gradient(x1);
    y = sub(g1,g0);
    ys = dot(y,s);
    Hy = dot(H1,y);
//    H1 = sub(add(H1,
//            mul(
//                    (ys+dot(y,Hy))/(ys*ys),
//                ten(s,s)    )),
//        div(add(ten(Hy,s),ten(s,Hy)),ys));
    x0 = x1;
    f0 = f1;
    g0 = g1;
    ++it;
  }
  return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations:it, message: msg};
}