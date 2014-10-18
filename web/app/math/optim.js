

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
  subsys.calcGrad(grad.data);

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
    subsys.calcGrad(grad.data);
    y = grad.subtract(y); // = grad - gradold

    //Now calculate the BFGS update on B
//    TCAD.math.bfgsUpdate(B, h, y);
    TCAD.math.bfgsUpdateInverse(B, y, h);


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
};

TCAD.math.solve_SD = function(subsys) {
  var i = 0;
  var grad = new TCAD.math.Vector(subsys.params.length);
  while (subsys.errorSquare() > 0.1 ) {
    subsys.calcGrad(grad.data);
    var xdir = grad.scalarMultiply(-1);
    TCAD.math.lineSearch(subsys, xdir);
    if (i ++ > 100) {
      return;
    }
  }
  console.log(subsys.errorSquare());
};

TCAD.math.lineSearch = function(subsys, xdir) {

  var f1,f2,f3,alpha1,alpha2,alpha3,alphaStar;

  var alphaMax = 1; //maxStep(xdir);

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
    