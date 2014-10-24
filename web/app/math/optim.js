

TCAD.optim = {};

// convergence Rough 1e-8
// convergence Fine  1e-10
TCAD.math.solve_BFGS = function(subsys, convergence, smallF) {

  var xsize = subsys.params.length;
  if (xsize == 0) {
    return "Success";
  }

  var xdir; //Vector
  var B = new TCAD.math.Matrix(xsize, xsize);
  B.identity();
  var x = new TCAD.math.Vector(xsize);
  var grad = new TCAD.math.Vector(xsize);
  var h = new TCAD.math.Vector(xsize);
  var y = new TCAD.math.Vector(xsize);

  // Initial unknowns vector and initial gradient vector
  TCAD.math.fillParams(subsys, x.data);
  subsys.calcGrad_(grad.data);

  // Initial search direction oposed to gradient (steepest-descent)
  xdir = grad.scalarMultiply(-1);
  TCAD.math.lineSearch(subsys, xdir);
  var err = subsys.errorSquare();

  h = x.copy();
  TCAD.math.fillParams(subsys, x.data);
  h = x.subtract(h); // = x - xold

  var maxIterNumber = 100 * xsize;
  var divergingLim = 1e6*err + 1e12;

  for (var iter=1; iter < maxIterNumber; iter++) {

    if (h.norm() <= convergence || err <= smallF)
      break;
    if (err > divergingLim || err != err) // check for diverging and NaN
      break;

    y = grad.copy();
    subsys.calcGrad_(grad.data);
    y = grad.subtract(y); // = grad - gradold

    //Now calculate the BFGS update on B
//    B = TCAD.math.bfgsUpdate(B, h, y);
//    B = TCAD.math.bfgsUpdateInverse(B, y, h);

    xdir = B.multiply(grad).scalarMultiply(-1);
//    xdir = grad.scalarMultiply(-1);

    TCAD.math.lineSearch(subsys, xdir);
    err = subsys.errorSquare();

    h = x.copy();
    TCAD.math.fillParams(subsys, x.data);
    h = x.subtract(h); // = x - xold
  }

  if (err <= smallF)
    return "Success";
  if (h.norm() <= convergence)
    return "Converged";
  return "Failed";
};

TCAD.math.solve_UNCMIN = function(subsys) {
  var x0 = [];
  subsys.fillParams(x0);
  
  var f = function(x) {
    subsys.setParams(x);
    return subsys.errorSquare();
  };
  var gradient = function(x) {
    subsys.setParams(x);
    var grad = [];
    subsys.calcGrad(grad);
    return grad;
  };
  numeric.uncmin(f,x0,0.01,gradient,1000);
};


TCAD.math.solve_TR = function(subsys) {

  var xsize = subsys.params.length;
  if (xsize == 0) {
    return "Success";
  }

  var p; //Vector
  var B = new TCAD.math.Matrix(xsize, xsize);
  B.identity();
  var H = new TCAD.math.Matrix(xsize, xsize);
  H.identity();

  var x = new TCAD.math.Vector(xsize);
  var grad = new TCAD.math.Vector(xsize);
  var h = new TCAD.math.Vector(xsize);
  var y = new TCAD.math.Vector(xsize);
  var pZero = new TCAD.math.Vector(xsize);

  TCAD.math.fillParams(subsys, x.data);
  subsys.calcGrad_(grad.data);
  p = grad.scalarMultiply(-1);

  var err = subsys.errorSquare();

  var delta = 0.01;
  var deltaD = 1;
  var nu = 0.1;


  var maxIterNumber = 100 * xsize;
  var divergingLim = 1e6*err + 1e12;


  function m(fx, p, g, B) {
    return fx + g.dot(p) + 0.5 * p.dot(B.multiply(p)); //4.3
  }

  function norm(x) {
    var sum = 0;
    for (var i = 0; i < x.rSize; i++) {
      var a = x.data[i][0];
      sum += a * a;
    }
    return Math.sqrt(sum);
  }

  var tolx = 0.01;
  for (var iter=1; iter < maxIterNumber; iter++) {

    TCAD.math.setParams2(subsys, x.data);
    var fx = subsys.errorSquare();

    if (fx <= tolx) break;
    //if (h.norm() <= tolx) break;
//    if (delta <= tolx*(tolx + x.norm())) break;
    if (fx > divergingLim || fx != fx) break;

    p = TCAD.math.cauchyPoint(delta, grad, B, norm);

    var xAddP = x.add(p);

    TCAD.math.setParams2(subsys, xAddP.data);
    var fxAddP = subsys.errorSquare();

    var r = ( fx - fxAddP ) / ( m(fx, pZero, grad, H) - m(fx, p, grad, H) );

    if (r < 0.25) {
      delta = 0.25 * norm(p);
    } else {
      if (r > 0.75) {
        delta = Math.min(delta * 2, deltaD);
      }
    }

    if (r > nu) {
      h = xAddP.subtract(x); // = x - xold
      x = xAddP;

      TCAD.math.setParams2(subsys, x.data);

      y = grad.copy();
      subsys.calcGrad_(grad.data);
      y = grad.subtract(y);

      //Now calculate the BFGS on B and H
      B = TCAD.math.bfgsUpdateInverse(B, y, h);
      H = TCAD.math.bfgsUpdate(H, y, h);
    }
  }
  TCAD.math.setParams2(subsys, x.data);
};


TCAD.math.cauchyPoint = function(delta, grad, B, normaF) {
  var tau;
  var tauCondition = grad.dot(B.multiply(grad))
  var norm = normaF(grad);
  if (tauCondition <= 0) {
    tau = 1;
  } else {
    tau = Math.min((norm*norm*norm)/(delta*tauCondition), 1);
  }
  return grad.scalarMultiply(- tau * delta / norm) ;
};

TCAD.math.fillParams = function(sys, out) {
  for (var p = 0; p < sys.params.length; p++) {
    out[p][0] = sys.params[p].get();
  }
};

TCAD.math.setParams2 = function(sys, point) {
  for (var p = 0; p < sys.params.length; p++) {
    sys.params[p].set(point[p][0]);
  }
};

TCAD.math.bfgsUpdateInverse = function(H, y, s) {
  // 18.16
  var I = new TCAD.math.Matrix(s.rSize, s.rSize);
  I.identity();

  var yT = y.transpose();
  var sT = s.transpose();
  var yT_x_s = y.dot(s);
  if (yT_x_s == 0) yT_x_h = .0000000001;

  var p = 1 / yT_x_s;

  var A = I.subtract( s.multiply(yT).scalarMultiply(p) )
  var B = I.subtract( y.multiply(sT).scalarMultiply(p) )
  var C = s.multiply(sT).scalarMultiply(p)
  return A.multiply(H).multiply(C).add(C);
};

TCAD.math.bfgsUpdate = function(B, y, h) {

  var B_x_h = B.multiply(h);
  var hT_x_B = h.transpose().multiply(B);
  var yT = y.transpose();
  var y_x_yT = y.multiply(yT);
  var yT_x_h = y.dot(h);
  var hT_x_B_x_h = h.dot(B_x_h)

  if (yT_x_h == 0) yT_x_h = .0000000001;
  if (hT_x_B_x_h == 0) hT_x_B_x_h = .0000000001;


  B = B.add( y_x_yT.scalarMultiply( 1 / yT_x_h ) );
  B = B.subtract( ( B_x_h.multiply(hT_x_B) ).scalarMultiply( 1./hT_x_B_x_h ) );
  return B;
};

TCAD.math.solve_SD = function(subsys) {
  var i = 0;
  var grad = new TCAD.math.Vector(subsys.params.length);
  while (subsys.errorSquare() > 0.1 ) {
    subsys.calcGrad_(grad.data);
    var xdir = grad.scalarMultiply(-1);
    TCAD.math.lineSearch(subsys, xdir);
    if (i ++ > 100) {
      return;
    }
  }
  console.log(subsys.errorSquare());
};

TCAD.math.lineSearchOrig = function(subsys, xdir) {

  var f1,f2,f3,alpha1,alpha2,alpha3,alphaStar;

  var alphaMax = 1e28; //maxStep(xdir);

  var x;
  var x0 = new TCAD.math.Vector(subsys.params.length);

  //Save initial values
  TCAD.math.fillParams(subsys, x0.data);

  //Start at the initial position alpha1 = 0
  alpha1 = 0.;
  f1 = subsys.errorSquare();

  //Take a step of alpha2 = 1
  alpha2 = 1.;
  x = x0.add(xdir.scalarMultiply(alpha2));
  TCAD.math.setParams2(subsys, x.data);
  f2 = subsys.errorSquare();

  //Take a step of alpha3 = 2*alpha2
  alpha3 = alpha2*2;
  x = x0.add(xdir.scalarMultiply(alpha3));
  TCAD.math.setParams2(subsys, x.data);
  f3 = subsys.errorSquare();

  //Now reduce or lengthen alpha2 and alpha3 until the minimum is
  //Bracketed by the triplet f1>f2<f3
  while (f2 > f1 || f2 > f3) {
    if (f2 > f1) {
      //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
      //Effectively both are shortened by a factor of two.
      alpha3 = alpha2;
      f3 = f2;
      alpha2 = alpha2 / 2;
      x = x0.add( xdir.scalarMultiply(alpha2 ));
      TCAD.math.setParams2(subsys, x.data);
      f2 = subsys.errorSquare();
    }
    else if (f2 > f3) {
      if (alpha3 >= alphaMax)
        break;
      //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
      //Effectively both are lengthened by a factor of two.
      alpha2 = alpha3;
      f2 = f3;
      alpha3 = alpha3 * 2;
      x = x0.add( xdir.scalarMultiply(alpha3));
      TCAD.math.setParams2(subsys, x.data);
      f3 = subsys.errorSquare();
    }
  }
  //Get the alpha for the minimum f of the quadratic approximation
  alphaStar = alpha2 + ((alpha2-alpha1)*(f1-f3))/(3*(f1-2*f2+f3));

  //Guarantee that the new alphaStar is within the bracket
  if (alphaStar >= alpha3 || alphaStar <= alpha1)
    alphaStar = alpha2;

  if (alphaStar > alphaMax)
    alphaStar = alphaMax;

  if (alphaStar != alphaStar)
    alphaStar = 0.;

  //Take a final step to alphaStar
  x = x0 .add( xdir.scalarMultiply( alphaStar ) );
  TCAD.math.setParams2(subsys, x.data);
  return alphaStar;

};

TCAD.math.lineSearchWeight = function(subsys, xdir) {

  var f1,f2,f3,alpha1,alpha2,alpha3,alphaStar;


  var alphaMax = 1e28; //maxStep(xdir);

  var x;
  var x0 = new TCAD.math.Vector(subsys.params.length);

  var costs = [];
  function updateCosts() {
    var maxErr = -1;
    var i;
    var t;
    for (i=0; i < subsys.constraints.length; i++) {
      t = subsys.constraints[i].error();
      maxErr = Math.max(maxErr, t*t);
    }
    if (maxErr > 0) {
      for (i=0; i < subsys.constraints.length; i++) {
        t = subsys.constraints[i].error();
        costs[i] = t*t / maxErr;
      }
    } else {
      TCAD.math.fill_array(costs, 0, subsys.constraints.length, 1)
    }
  }
  updateCosts();
//  console.log(costs);
  var xdir = new TCAD.math.Vector(subsys.params.length);
  calcGrad = function(out) {
    var i;
    for (i = 0; i < out.length; ++i) {
      out[i][0] = 0;
    }

    for (i=0; i < subsys.constraints.length; i++) {
      var c = subsys.constraints[i];

      var cParams = c.params;
      var grad = [];
      c.gradient(grad);

      for (var p = 0; p < cParams.length; p++) {
        var param = cParams[p];
        var j = param.j;
        out[j][0] += costs[i] * grad[p]; // (10.4)
      }
    }
  };
  calcGrad(xdir.data)
  console.log(xdir.data);

  function errorSquare() {
    var error = 0;
    for (var i = 0; i < subsys.constraints.length; i++) {
      var t = subsys.constraints[i].error();
      error += t * t * costs[i];
    }
    return error * 0.5;
  }


  //Save initial values
  TCAD.math.fillParams(subsys, x0.data);

  //Start at the initial position alpha1 = 0
  alpha1 = 0.;
  f1 = errorSquare();


  //Take a step of alpha2 = 1
  alpha2 = 1.;
  x = x0.add(xdir.scalarMultiply(alpha2));
  TCAD.math.setParams2(subsys, x.data);
  f2 = errorSquare();

  //Take a step of alpha3 = 2*alpha2
  alpha3 = alpha2*2;
  x = x0.add(xdir.scalarMultiply(alpha3));
  TCAD.math.setParams2(subsys, x.data);
  f3 = errorSquare();

  //Now reduce or lengthen alpha2 and alpha3 until the minimum is
  //Bracketed by the triplet f1>f2<f3
  while (f2 > f1 || f2 > f3) {
    if (f2 > f1) {
      //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
      //Effectively both are shortened by a factor of two.
      alpha3 = alpha2;
      f3 = f2;
      alpha2 = alpha2 / 2;
      x = x0.add( xdir.scalarMultiply(alpha2 ));
      TCAD.math.setParams2(subsys, x.data);
      f2 = errorSquare();
    }
    else if (f2 > f3) {
      if (alpha3 >= alphaMax)
        break;
      //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
      //Effectively both are lengthened by a factor of two.
      alpha2 = alpha3;
      f2 = f3;
      alpha3 = alpha3 * 2;
      x = x0.add( xdir.scalarMultiply(alpha3));
      TCAD.math.setParams2(subsys, x.data);
      f3 = errorSquare();
    }
  }
  //Get the alpha for the minimum f of the quadratic approximation
  alphaStar = alpha2 + ((alpha2-alpha1)*(f1-f3))/(3*(f1-2*f2+f3));

  //Guarantee that the new alphaStar is within the bracket
  if (alphaStar >= alpha3 || alphaStar <= alpha1)
    alphaStar = alpha2;

  if (alphaStar > alphaMax)
    alphaStar = alphaMax;

  if (alphaStar != alphaStar)
    alphaStar = 0.;

  //Take a final step to alphaStar
  x = x0 .add( xdir.scalarMultiply( alphaStar ) );
  TCAD.math.setParams2(subsys, x.data);
//  console.log(alphaStar);
  return alphaStar;

};

TCAD.math.lineSearchWolfeCond = function(sys, d) {

  var c1 = 0.1;
  var c2 = 0.9;

  var x0 = new TCAD.math.Vector(sys.params.length);
  TCAD.math.fillParams(sys, x0.data);

  var alpha = 1;
  var fx0 = sys.errorSquare();
  var grad = new TCAD.math.Vector(sys.params.length);
  sys.calcGrad_(grad.data);
  var gx0 = grad.dot(d);

  //bound the solution
  var alphaL = 0;
  var alphaR = 10000;
  var maxit = 800;

  for (var iter = 1; iter <= maxit; iter++){
    var xp = x0.add(d.scalarMultiply(alpha));

    TCAD.math.setParams2(sys, xp.data);
    var erroralpha = sys.errorSquare(); //get the error at that point

    if (erroralpha >= fx0 + alpha * c1 * gx0)  { // if error is not sufficiently reduced
      alphaR = alpha;//move halfway between current alpha and lower alpha
      alpha = (alphaL + alphaR)/2.0;
    }else{//if error is sufficiently decreased

      TCAD.math.setParams2(sys, xp.data);
      sys.calcGrad_(grad.data);
      var slopealpha = grad.dot(d); // then get slope along search direction
      if (slopealpha <= c2 * Math.abs(gx0)){ // if slope sufficiently closer to 0
        break;//then this is an acceptable point
      }else if ( slopealpha >= c2 * gx0) { // if slope is too steep and positive then go to the left
        alphaR = alpha;//move halfway between current alpha and lower alpha
        alpha = (alphaL+ alphaR)/2;
      }else{//if slope is too steep and negative then go to the right of this alpha
        alphaL = alpha;//move halfway between current alpha and upper alpha
        alpha = (alphaL+ alphaR)/2;
      }
    }
  }

  //if ran out of iterations then return the best thing we got
  var x = x0.add(d.scalarMultiply(alpha));
  TCAD.math.setParams2(sys, x.data);
  return alpha;
};

TCAD.math.lineSearch3 = function(sys, xdir) {

  var x0 = new TCAD.math.Vector(sys.params.length);
  var x = new TCAD.math.Vector(sys.params.length);
  TCAD.math.fillParams(sys, x0.data);

  var alphas = [];
  for (var i = 0; i < xdir.data.length; i++) {
    alphas[i] = Number.MAX_VALUE;
  }
  for (var i = 0; i < sys.constraints.length; i++) {
    TCAD.math.lineSearchForConstraint(sys.constraints[i], alphas, xdir, sys);
    TCAD.math.setParams2(sys, x0.data);
  }

  for (var i = 0; i < xdir.data.length; i++) {
    x.data[i][0] = xdir.data[i][0] * alphas[i] + x0.data[i][0];
  }

  //Take a final step to alphaStar
  TCAD.math.setParams2(sys, x.data);
};


TCAD.math.lineSearchForConstraint = function(constr, alphas, _xdir, sys) {

  var f1,f2,f3,alpha1,alpha2,alpha3,alphaStar;

  var alphaMax = 1e28; //maxStep(xdir);

  var x;
  var xdir = new TCAD.math.Vector(constr.params.length);
  var x0 = new TCAD.math.Vector(constr.params.length);

  for (var p = 0; p < constr.params.length; p++) {
    x0.data[p][0] = constr.params[p].get();
    xdir.data[p][0] = _xdir.data[constr.params[p].j][0];
  }

  function errorSquare() {
//    var t = constr.error();
//    return t*t*0.5;
    return sys.errorSquare();
  }

  function setParams2(x) {
    for (var p = 0; p < constr.params.length; p++) {
      constr.params[p].set(x.data[p][0]);
    }
  }

  //Start at the initial position alpha1 = 0
  alpha1 = 0.;
  f1 = errorSquare();

  //Take a step of alpha2 = 1
  alpha2 = 1.;
  x = x0.add(xdir.scalarMultiply(alpha2));
  setParams2(x);
  f2 = errorSquare();

  //Take a step of alpha3 = 2*alpha2
  alpha3 = alpha2*2;
  x = x0.add(xdir.scalarMultiply(alpha3));
  setParams2(x);
  f3 = errorSquare();

  //Now reduce or lengthen alpha2 and alpha3 until the minimum is
  //Bracketed by the triplet f1>f2<f3
  while (f2 > f1 || f2 > f3) {
    if (f2 > f1) {
      //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
      //Effectively both are shortened by a factor of two.
      alpha3 = alpha2;
      f3 = f2;
      alpha2 = alpha2 / 2;
      x = x0.add( xdir.scalarMultiply(alpha2 ));
      setParams2(x);
      f2 = errorSquare();
    }
    else if (f2 > f3) {
      if (alpha3 >= alphaMax)
        break;
      //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
      //Effectively both are lengthened by a factor of two.
      alpha2 = alpha3;
      f2 = f3;
      alpha3 = alpha3 * 2;
      x = x0.add( xdir.scalarMultiply(alpha3));
      setParams2(x);
      f3 = errorSquare();
    }
  }
  //Get the alpha for the minimum f of the quadratic approximation
  alphaStar = alpha2 + ((alpha2-alpha1)*(f1-f3))/(3*(f1-2*f2+f3));

  //Guarantee that the new alphaStar is within the bracket
  if (alphaStar >= alpha3 || alphaStar <= alpha1)
    alphaStar = alpha2;

  if (alphaStar > alphaMax)
    alphaStar = alphaMax;

  if (alphaStar != alphaStar)
    alphaStar = 0.;


  for (var p = 0; p < constr.params.length; p++) {
    var j = constr.params[p].j;
    alphas[j] = Math.min(alphas[j], alphaStar);
  }

  return alphaStar;
};


TCAD.math.lineSearch2 = function(subsys, xdir) {

  var x0 = new TCAD.math.Vector(subsys.params.length);
  TCAD.math.fillParams(subsys, x0.data);

  var alpha = 1.;
  var f0 = subsys.errorSquare();

  var x = x0.add(xdir.scalarMultiply(alpha));
  TCAD.math.setParams2(subsys, x.data);
  var f = subsys.errorSquare();

  while (f > f0 || alpha > 0.00000001) {
    alpha *= .5;
    x = x0.add(xdir.scalarMultiply(alpha));
    TCAD.math.setParams2(subsys, x.data);
    f = subsys.errorSquare();
  }

  return alphaStar;

};


TCAD.math.lineSearch = TCAD.math.lineSearchWeight;
//TCAD.math.lineSearch = TCAD.math.lineSearchOrig;

TCAD.math.fill_array = function(a, fromIndex, toIndex,val) {
  for (var i = fromIndex; i < toIndex; i++) a[i] = val;
};