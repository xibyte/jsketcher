package cad.gcs;

import gnu.trove.list.TDoubleList;
import gnu.trove.list.array.TDoubleArrayList;
import org.apache.commons.math3.exception.ConvergenceException;
import org.apache.commons.math3.exception.DimensionMismatchException;
import org.apache.commons.math3.exception.MathInternalError;
import org.apache.commons.math3.exception.util.LocalizedFormats;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.BlockRealMatrix;
import org.apache.commons.math3.linear.DecompositionSolver;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.QRDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.SingularMatrixException;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;

public class Solver {

  public static final boolean useLU = true;
  private static final double DBL_EPSILON = Double.MIN_VALUE;

  enum SolveStatus {
    Success,   // Found a solution zeroing the error function
    Converged, // Found a solution minimizing the error function
    Failed     // Failed to find any solution
  }

  static int MaxIterations = 100; //Note that the total number of iterations allowed is MaxIterations *xLength


  public static SolveStatus solve_DL(SubSystem subsys) {
    double tolg = 1e-80, tolx = 1e-80, tolf = 1e-10;

    int xsize = subsys.pSize();
    int csize = subsys.cSize();

    if (xsize == 0)
      return SolveStatus.Success;

    RealMatrix x = mtrx(xsize), x_new = mtrx(xsize);
    RealMatrix fx = mtrx(csize), fx_new = mtrx(csize);
    RealMatrix Jx = mtrx(csize, xsize), Jx_new = mtrx(csize, xsize);
    RealMatrix g = mtrx(xsize), h_sd = mtrx(xsize), h_gn = mtrx(xsize), h_dl = mtrx(xsize);

//    subsys.redirectParams();

    double err;
    subsys.fillParams(x);
    err = subsys.calcResidual(fx);
    subsys.calcJacobi(Jx);

    g = Jx.transpose().multiply(fx.scalarMultiply(-1));

    // get the infinity norm fx_inf and g_inf
    double g_inf = infinityNorm(g);
    double fx_inf = infinityNorm(fx);

    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * err + 1e12;

    double delta = 0.1;
    double alpha = 0.;
    double nu = 2.;
    int iter = 0, stop = 0, reduce = 0;
    double mu =  1e-8;
    while (stop == 0) {

      // check if finished
      if (fx_inf <= tolf) // Success
        stop = 1;
      else if (g_inf <= tolg)
        stop = 2;
      else if (delta <= tolx * (tolx + x.getFrobeniusNorm()))
        stop = 2;
      else if (iter >= maxIterNumber)
        stop = 4;
      else if (err > divergingLim || err != err) { // check for diverging and NaN
        stop = 6;
      } else {
        // get the steepest descent direction
        alpha = squaredNorm(g) / squaredNorm((Jx.multiply(g)));
        h_sd = g.scalarMultiply(alpha);

        RealMatrix A = Jx.transpose().multiply(Jx);
        RealMatrix gg = Jx.transpose().multiply(fx.scalarMultiply(-1));
        double[] diag_A = diagonal(A);
        
        double mu_increase_factor_ = 10.0;
        do  {
          for (int i = 0; i < xsize; ++i) {
            A.addToEntry(i, i, mu);
          }

          boolean success = true;
          try {
            h_gn = new LUDecomposition(A).getSolver().solve(gg);
          } catch (Exception ssse) {
            java.lang.System.out.println(ssse.getMessage());
            success = false;
          }
          if (success) {
            break;
          }
          mu *= mu_increase_factor_;
        } while (mu < 1.0);
        
        // get the gauss-newton step
//        h_gn = new LUDecomposition(new Array2DRowRealMatrix(makeSquare(Jx.getData()))).getSolver().solve(fx.scalarMultiply(-1));


        for (int i = 0; i < xsize; ++i) // restore diagonal J^T J entries
        {
          A.setEntry(i, i, diag_A[i]);
        }
        double rel_error = (Jx.multiply(h_gn).add(fx)).getFrobeniusNorm() / fx.getFrobeniusNorm();
        if (rel_error > 1e15)
          break;

        // compute the dogleg step
        if (h_gn.getFrobeniusNorm() < delta) {
          h_dl = h_gn;
          if (h_dl.getFrobeniusNorm() <= tolx * (tolx + x.getFrobeniusNorm())) {
            stop = 5;
            break;
          }
        } else if (alpha * g.getFrobeniusNorm() >= delta) {
          h_dl = h_sd.scalarMultiply(delta / (alpha * g.getFrobeniusNorm()));
        } else {
          //compute beta
          double beta = 0;
          RealMatrix b = h_gn.subtract(h_sd);
          double bb = (b.transpose().multiply(b)).getFrobeniusNorm();
          double gb = (h_sd.transpose().multiply(b)).getFrobeniusNorm();
          double c = (delta + h_sd.getFrobeniusNorm()) * (delta - h_sd.getFrobeniusNorm());

          if (gb > 0)
            beta = c / (gb + Math.sqrt(gb * gb + c * bb));
          else
            beta = (Math.sqrt(gb * gb + c * bb) - gb) / bb;

          // and update h_dl and dL with beta
          h_dl = h_sd.add(b.scalarMultiply(beta));
        }
      }

      // see if we are already finished
      if (stop != 0)
        break;

// it didn't work in some tests
//        // restrict h_dl according to maxStep
//        double scale = subsys->maxStep(h_dl);
//        if (scale < 1.)
//            h_dl *= scale;

      // get the new values
      double err_new;
      x_new = x.add(h_dl);
      subsys.setParams(x_new);
      err_new = subsys.calcResidual(fx_new);
      subsys.calcJacobi(Jx_new);

      // calculate the linear model and the update ratio
      double dL = err - 0.5 * squaredNorm((fx.add(Jx.multiply(h_dl))));
      double dF = err - err_new;
      double rho = dL / dF;

      if (dF > 0 && dL > 0) {
        x = x_new.copy();
        Jx = Jx_new.copy();
        fx = fx_new.copy();
        err = err_new;

        g = Jx.transpose().multiply(fx.scalarMultiply(-1));

        // get infinity norms
        g_inf = infinityNorm(g);
        fx_inf = infinityNorm(fx);
      } else
        rho = -1;

      // update delta
      if (Math.abs(rho - 1.) < 0.2 && h_dl.getFrobeniusNorm() > delta / 3. && reduce <= 0) {
        delta = 3 * delta;
        nu = 2;
        reduce = 0;
      } else if (rho < 0.25) {
        delta = delta / nu;
        nu = 2 * nu;
        reduce = 2;
      } else
        reduce--;

      // count this iteration and start again
      iter++;
    }

//    subsys.revertParams();

    return (stop == 1) ? SolveStatus.Success : SolveStatus.Failed;
  }

  private static RealMatrix lu(RealMatrix jx, RealMatrix fx) {

    return new org.apache.commons.math3.linear.LUDecomposition(new Array2DRowRealMatrix(makeSquare(jx.getData()))).getSolver().solve(fx);

//    DoubleMatrix2D solve = new LUDecomposition(new DenseDoubleMatrix2D(jx.getData()))
//        .solve(new DenseDoubleMatrix2D(fx.getData()));
  }

  public static double[][] makeSquare(double[][] m) {
    if (m.length > m[0].length) {
      for (int r = 0; r < m.length; r++) {
        double[] row = m[r];
        m[r] = new double[m.length];
        java.lang.System.arraycopy(row, 0, m[r], 0, row.length);
      }
    } else {
      double[][] _m = new double[m[0].length][];
      for (int r = 0; r < m.length; r++) {
        _m[r] = m[r];
      }
      for (int r = m.length; r < _m.length; r++) {
        _m[r] = new double[m[0].length];
      }
      m = _m;
    }
    return m;
  }


  public static void optimize(SubSystem subSystem) {

    final int cSize = subSystem.cSize();

    final double[] currentPoint = subSystem.getParams().toArray();
    final int pSize = currentPoint.length;

    // iterate until convergence is reached
    double[] current = null;
    int iter = 0;
    for (boolean converged = false; !converged; ) {
      ++iter;

      // evaluate the objective function and its jacobian
      // Value of the objective function at "currentPoint".
      final double[] currentResiduals = subSystem.calcResidual().toArray();
      final RealMatrix jacobian = new Array2DRowRealMatrix(makeSquare(subSystem.makeJacobi().getData()));

      // build the linear problem
      final double[] b = new double[pSize];
      final double[][] a = new double[pSize][pSize];
      for (int i = 0; i < cSize; ++i) {

        final double[] grad = jacobian.getRow(i);
        final double weight = 1;
        final double residual = currentResiduals[i];

        // compute the normal equation
        final double wr = weight * residual;
        for (int j = 0; j < pSize; ++j) {
          b[j] += wr * grad[j];
        }

        // build the contribution matrix for measurement i
        for (int k = 0; k < pSize; ++k) {
          double[] ak = a[k];
          double wgk = weight * grad[k];
          for (int l = 0; l < pSize; ++l) {
            ak[l] += wgk * grad[l];
          }
        }
      }

      try {
        // solve the linearized least squares problem
        RealMatrix mA = new BlockRealMatrix(a);
        DecompositionSolver solver = useLU ?
            new org.apache.commons.math3.linear.LUDecomposition(jacobian).getSolver() :
            new QRDecomposition(jacobian).getSolver();
        final double[] dX = solver.solve(new ArrayRealVector(currentPoint).mapMultiply(-1)).toArray();
        // update the estimated parameters
        for (int i = 0; i < pSize; ++i) {
          currentPoint[i] += dX[i];
        }
        subSystem.setParams(currentPoint);
      } catch (SingularMatrixException e) {
        throw new ConvergenceException(LocalizedFormats.UNABLE_TO_SOLVE_SINGULAR_PROBLEM);
      }

      // Check convergence.
      if (iter != 0) {
//        converged = checker.converged(iter, previous, current);
//        if (converged) {
//          setCost(computeCost(currentResiduals));
//          return current;
//        }
        if (subSystem.valueSquared() < 0.0001) {
          return;
        }
      }
    }
    // Must never happen.
    throw new MathInternalError();
  }

  public RealMatrix solve(RealMatrix b, int[] pivot, double[][] lu) {

    final int m = pivot.length;
    if (b.getRowDimension() != m) {
      throw new DimensionMismatchException(b.getRowDimension(), m);
    }
    final int nColB = b.getColumnDimension();

    // Apply permutations to b
    final double[][] bp = new double[m][nColB];
    for (int row = 0; row < m; row++) {
      final double[] bpRow = bp[row];
      final int pRow = pivot[row];
      for (int col = 0; col < nColB; col++) {
        bpRow[col] = b.getEntry(pRow, col);
      }
    }

    // Solve LY = b
    for (int col = 0; col < m; col++) {
      final double[] bpCol = bp[col];
      for (int i = col + 1; i < m; i++) {
        final double[] bpI = bp[i];
        final double luICol = lu[i][col];
        for (int j = 0; j < nColB; j++) {
          bpI[j] -= bpCol[j] * luICol;
        }
      }
    }

    // Solve UX = Y
    for (int col = m - 1; col >= 0; col--) {
      final double[] bpCol = bp[col];
      final double luDiag = lu[col][col];
      for (int j = 0; j < nColB; j++) {
        bpCol[j] /= luDiag;
      }
      for (int i = 0; i < col; i++) {
        final double[] bpI = bp[i];
        final double luICol = lu[i][col];
        for (int j = 0; j < nColB; j++) {
          bpI[j] -= bpCol[j] * luICol;
        }
      }
    }

    return new Array2DRowRealMatrix(bp, false);
  }


  public static SolveStatus solve_LM(SubSystem subsys) {
    int xsize = subsys.pSize();
    int csize = subsys.cSize();

    if (xsize == 0) {
      return SolveStatus.Success;
    }

    RealMatrix e = mtrx(csize), e_new = mtrx(csize); // vector of all function errors (every constraint is one function)
    RealMatrix J = mtrx(csize, xsize);        // Jacobi of the subsystem
    RealMatrix A = mtrx(xsize, xsize);
    RealMatrix x = mtrx(xsize), h = mtrx(xsize), x_new = mtrx(xsize), g = mtrx(xsize);
    double[] diag_A;

//    subsys.redirectParams();

    subsys.fillParams(x);
    subsys.calcResidual(e);
    e = e.scalarMultiply(-1);

    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * squaredNorm(e) + 1e12;

    double eps = 1e-10, eps1 = 1e-80;
    double tau = 1e-3;
    double nu = 2, mu = 0;
    int iter = 0, stop = 0;
    for (iter = 0; iter < maxIterNumber && stop == 0; ++iter) {

      // check error
      double err = squaredNorm(e);
      if (err <= eps) { // error is small, Success
        stop = 1;
        break;
      } else if (err > divergingLim || err != err) { // check for diverging and NaN
        stop = 6;
        break;
      }

      // J^T J, J^T e
      subsys.calcJacobi(J);
      ;

      A = J.transpose().multiply(J);
      g = J.transpose().multiply(e);

      // Compute ||J^T e||_inf
      double g_inf = infinityNorm(g);
      diag_A = diagonal(A); // save diagonal entries so that augmentation can be later canceled

      // check for convergence
      if (g_inf <= eps1) {
        stop = 2;
        break;
      }

      // compute initial damping factor
      if (iter == 0) {
        mu = tau *  new ArrayRealVector(diag_A).getLInfNorm() ;
      }

      // determine increment using adaptive damping
      int k = 0;
      while (k < 50) {
        // augment normal equations A = A+uI
        for (int i = 0; i < xsize; ++i) {
          A.addToEntry(i, i, mu);
        }

        //solve augmented functions A*h=-g

        for (int _ = 0; _ < 1000; _++) {
          try {
            h = new LUDecomposition(A).getSolver().solve(g);
          } catch (Exception ssse) {
            mu *= 1./3.;
            for (int i = 0; i < xsize; ++i) {
              A.setEntry(i, i, diag_A[i] * mu);
            }
            if (_ == 999) {
              return SolveStatus.Success;
            }
            continue;
          }
          break;
        }
        
        double rel_error = (A.multiply(h).subtract(g)).getFrobeniusNorm() / g.getFrobeniusNorm();

        // check if solving works
        if (rel_error < 1e-5) {

          // restrict h according to maxStep
//          double scale = subsys.maxStep(h);
//          if (scale < 1.) {
//            h = h.scalarMultiply(scale);
//          }

          // compute par's new estimate and ||d_par||^2
          x_new = x.add(h);
          double h_norm = squaredNorm(h);

          if (h_norm <= eps1 * eps1 * x.getFrobeniusNorm()) { // relative change in p is small, stop
            stop = 3;
            break;
          } else if (h_norm >= (x.getFrobeniusNorm() + eps1) / (DBL_EPSILON * DBL_EPSILON)) { // almost singular
            stop = 4;
            break;
          }

          subsys.setParams(x_new); 
          subsys.calcResidual(e_new);
          e_new = e_new.scalarMultiply(-1);

          double dF = squaredNorm(e) - squaredNorm(e_new);
          double dL = dot(h, (h.scalarMultiply(mu).add(g)));

          if (dF > 0. && dL > 0.) { // reduction in error, increment is accepted
            double tmp = 2 * dF / dL - 1.;
            mu *= Math.max(1. / 3., 1. - tmp * tmp * tmp);
            nu = 2;

            // update par's estimate
            x = x_new.copy();
            e = e_new.copy();
            break;
          }
        }

        // if this point is reached, either the linear system could not be solved or
        // the error did not reduce; in any case, the increment must be rejected

        mu *= nu;
        nu *= 2.0;
        for (int i = 0; i < xsize; ++i) // restore diagonal J^T J entries
        {
          A.setEntry(i, i, diag_A[i]);
        }

        k++;
      }
      if (k > 50) {
        stop = 7;
        break;
      }
    }

    if (iter >= maxIterNumber) {
      stop = 5;
    }

//    subsys.revertParams();

    return (stop == 1) ? SolveStatus.Success : SolveStatus.Failed;
  }

  private static void identity(RealMatrix m) {
    for (int i = 0; i < m.getColumnDimension() && i < m.getRowDimension(); i++) {
      m.setEntry(i, i, 1.0);
    }
  }


  static double lineSearch(SubSystem subsys, RealMatrix xdir) {
    double f1, f2, f3, alpha1, alpha2, alpha3, alphaStar;

    double alphaMax = 1;//subsys.maxStep(xdir);

    int pSize = subsys.pSize();
    RealMatrix x0 = mtrx(pSize), x = mtrx(pSize);

    //Save initial values
    subsys.fillParams(x0);

    //Start at the initial position alpha1 = 0
    alpha1 = 0.;
    f1 = subsys.errorSquared();

    //Take a step of alpha2 = 1
    alpha2 = 1.;
    x = x0.add(xdir.scalarMultiply(alpha2));
    subsys.setParams(x);
    f2 = subsys.errorSquared();

    //Take a step of alpha3 = 2*alpha2
    alpha3 = alpha2 * 2;
    x = x0.add(xdir.scalarMultiply(alpha3));
    subsys .setParams(x);
    f3 = subsys .errorSquared();

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
        subsys . setParams(x);
        f2 = subsys .errorSquared();
      } else if (f2 > f3) {
        if (alpha3 >= alphaMax) {
          break;
        }
        //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
        //Effectively both are lengthened by a factor of two.
        alpha2 = alpha3;
        f2 = f3;
        alpha3 = alpha3 * 2;
        x = x0.add( xdir.scalarMultiply(alpha3));
        subsys . setParams(x);
        f3 = subsys .errorSquared();
      }
    }
    //Get the alpha for the minimum f of the quadratic approximation
    alphaStar = alpha2 + ((alpha2 - alpha1) * (f1 - f3)) / (3 * (f1 - 2 * f2 + f3));

    //Guarantee that the new alphaStar is within the bracket
    if (alphaStar >= alpha3 || alphaStar <= alpha1) {
      alphaStar = alpha2;
    }

    if (alphaStar > alphaMax) {
      alphaStar = alphaMax;
    }

    if (alphaStar != alphaStar) {
      alphaStar = 0.;
    }

    //Take a final step to alphaStar
    x = x0 .add( xdir.scalarMultiply( alphaStar ) );
    subsys . setParams(x);

    return alphaStar;
  }
  
  public static SolveStatus solve_BFGS(SubSystem subsys, boolean isFine) {
    int xsize = subsys.pSize();
    if (xsize == 0) {
      return SolveStatus.Success;
    }


    RealMatrix D = new Array2DRowRealMatrix(xsize, xsize);
    identity(D);
//    
    RealMatrix x = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix xdir = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix grad = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix h = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix y = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix Dy = new Array2DRowRealMatrix(xsize, 1);

    // Initial unknowns vector and initial gradient vector
    subsys.fillParams(x);
    subsys.calcGrad(grad);

    // Initial search direction oposed to gradient (steepest-descent)
    xdir = grad.scalarMultiply(-1);
    lineSearch(subsys, xdir);
    double err = subsys.errorSquared();

    h = x.copy();
    subsys.fillParams(x);
    h = x.subtract(h); // = x - xold

    double convergence = isFine ? XconvergenceFine : XconvergenceRough;
    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * err + 1e12;

    for (int iter = 1; iter < maxIterNumber; iter++) {

      if (h.getFrobeniusNorm() <= convergence || err <= smallF) {
        break;
      }
      if (err > divergingLim || err != err) // check for diverging and NaN
      {
        break;
      }

      y = grad.copy();
      subsys.calcGrad(grad);
      y = grad.subtract(y); // = grad - gradold

      double hty = dotProduct(h, y);
      //make sure that hty is never 0
      if (hty == 0) {
        hty = .0000000001;
      }

      Dy = D.multiply(y);

      double ytDy = dotProduct(y, Dy);

      //Now calculate the BFGS update on D
      D = D.add(h.scalarMultiply((1. + ytDy / hty) / hty).multiply(h.transpose()));
      D = D.subtract((
                      h.multiply(Dy.transpose())
                              .add(Dy.multiply(h.transpose()))
              ).scalarMultiply(1. / hty)
      );

      xdir = D.scalarMultiply(-1).multiply(grad);
      lineSearch(subsys, xdir);
      err = subsys.errorSquared();

      h = x.copy();
      subsys.fillParams(x);
      h = x.subtract(h); // = x - xold
    }

//    subsys.revertParams();

    if (err <= smallF) {
      return SolveStatus.Success;
    }
    if (h.getFrobeniusNorm() <= convergence) {
      return SolveStatus.Converged;
    }
    return SolveStatus.Failed;
  }


  private static double[] diagonal(RealMatrix a) {
    int s = Math.min(a.getColumnDimension(), a.getRowDimension());
    double[] d = new double[s];
    for (int i = 0; i < s; i++) {
      d[i] = a.getEntry(i, i);
    }
    return d;
  }

  private static double dot(RealMatrix m1, RealMatrix m2) {
    return new ArrayRealVector(m1.getData()[0]).dotProduct(new ArrayRealVector(m2.getData()[0]));
  }

  private static double infinityNorm(RealMatrix g) {
    return new ArrayRealVector(g.getData()[0]).getLInfNorm();
  }

  private static double squaredNorm(RealMatrix matrix) {
    double norm = matrix.getFrobeniusNorm();
    return norm * norm;
  }

  private static RealMatrix mtrx(int size) {
    return new Array2DRowRealMatrix(size, 1);
  }

  private static RealMatrix mtrx(int rsize, int csize) {
    return new Array2DRowRealMatrix(rsize, csize);
  }

  static class ParamInfo {

    final int id;
    final List<Constraint> constraints = new ArrayList<>();

    ParamInfo(int id) {
      this.id = id;
    }
  }

  public static class SubSystem {

    public final List<Constraint> constraints;
    private final LinkedHashMap<Param, ParamInfo> params = new LinkedHashMap<>();

    public SubSystem(List<Constraint> constraints) {
      this.constraints = constraints;
      for (Constraint c : constraints) {

        for (Param p : c.getParams()) {
          ParamInfo paramInfo = params.get(p);
          if (paramInfo == null) {
            paramInfo = new ParamInfo(params.size());
            params.put(p, paramInfo);
          }
          paramInfo.constraints.add(c);
        }
      }
    }

    public int pSize() {
      return params.size();
    }

    public int cSize() {
      return constraints.size();
    }


    public void fillParams(RealMatrix x) {
      x.setColumn(0, getParams().toArray());
    }

    public TDoubleList getParams() {
      TDoubleList params_ = new TDoubleArrayList();
      for (Param p : params.keySet()) {
        params_.add(p.get());
      }
      return params_;
    }

    public TDoubleList getValues() {
      TDoubleList values = new TDoubleArrayList();
      for (Constraint c : constraints) {
        values.add(c.error());
      }
      return values;
    }
    
    public double calcResidual(RealMatrix r) {
      double err = 0.;
      int i = 0;
      for (Constraint c : constraints) {
        double v = c.error();
        r.setEntry(i++, 0, v);
        err += v * v;
      }
      err *= 0.5;
      return err;
    }

    public TDoubleList calcResidual() {
      TDoubleList r = new TDoubleArrayList();
      double err = 0.;
      int i = 0;
      for (Constraint c : constraints) {
        double v = c.error();
        r.add(v);
        err += v * v;
      }
      err *= 0.5;
      return r;
    }

    public double valueSquared() {
      double err = 0.;
      for (Constraint c : constraints) {
        double v = c.error();
        err += v * v;
      }
      err *= 0.5;
      return err;
    }

    public double value() {
      double err = 0.;
      for (Constraint c : constraints) {
        err += Math.abs(c.error());
      }
      return err;
    }


    public void calcJacobi(RealMatrix jacobi) {
//      jacobi.setZero(csize, params.size());
      for (int j=0; j < pSize(); j++) {
        for (int i=0; i < constraints.size(); i++) {
          jacobi.setEntry(i, j, 0);
        }
      }
      for (int i=0; i < constraints.size(); i++) {
        Constraint c = constraints.get(i);

        Param[] cParams = c.getParams();
        double[] grad = new double[cParams.length];
        c.gradient(grad);

        for (int p = 0; p < cParams.length; p++) {
          Param param = cParams[p];
          int j = params.get(param).id;
          jacobi.setEntry(i,j, param.isLocked() ? 0 : grad[p]);
        }
      }
    }

    public RealMatrix makeJacobi() {
      RealMatrix jacobi = new Array2DRowRealMatrix(cSize(), pSize());
      calcJacobi(jacobi);
      return jacobi;
    }

    public void setParams(RealMatrix params) {
      setParams(params.getColumn(0));
    }
    
    public void setParams(double[] arr) {
      Iterator<Param> pit = params.keySet().iterator();
      for (double v : arr) {
        pit.next().set(v);
      }
    }

    public double errorSquared() {
      return valueSquared();
    }

    public double[] calcGrad() {
      double[] grad = new double[params.size()];
      for (Constraint c : constraints) {
        double error = c.error();
        
        double[] localGrad = new double[c.pSize()];
        c.gradient(localGrad);

        Param[] localParams = c.getParams();
        for (int i = 0; i < localParams.length; i++) {
          grad[params.get(localParams[i]).id] += error * localGrad[i];
        }
      }
      return grad;
    }
    
    public void calcGrad(RealMatrix out) {
      double[] grad = calcGrad();
      for (int i = 0; i < grad.length; i++) {
        double v = calcGrad()[i];
        out.setEntry(i, 0, v);
      }
    }


  }

  private static double dotProduct(RealMatrix m1, RealMatrix m2) {
    return new ArrayRealVector(m1.getData()[0]).dotProduct(new ArrayRealVector(m2.getData()[0]));
  }

  static double XconvergenceRough = 1e-8;
  static double XconvergenceFine = 1e-10;
  static double smallF = 1e-20;
}
