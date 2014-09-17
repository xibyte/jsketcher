package cad.gcs;

import gnu.trove.list.TDoubleList;
import gnu.trove.list.array.TDoubleArrayList;
import org.apache.commons.math3.exception.DimensionMismatchException;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealMatrix;

import java.util.List;

public class Solver {

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

        // get the gauss-newton step
        h_gn = lu(Jx, fx.scalarMultiply(-1));
        double rel_error = (Jx.transpose().multiply(h_gn).add(fx)).getFrobeniusNorm() / fx.getFrobeniusNorm();
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
        x = x_new;
        Jx = Jx_new;
        fx = fx_new;
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

    return new cad.gcs.LUDecomposition(jx).solve(fx);
    
//    DoubleMatrix2D solve = new LUDecomposition(new DenseDoubleMatrix2D(jx.getData()))
//        .solve(new DenseDoubleMatrix2D(fx.getData()));
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

  public static class SubSystem {

    private final List<Constraint> constraints;

    public SubSystem(List<Constraint> constraints) {
      this.constraints = constraints;
    }

    public int pSize() {
      int s = 0;
      for (Constraint c : constraints) {
        s += c.params().length;
      }
      return s;
    }

    public int cSize() {
      return constraints.size();
    }


    public void fillParams(RealMatrix x) {
      int i = 0;
      TDoubleList params = new TDoubleArrayList();
      for (Constraint c : constraints) {
        params.add(c.params());
      }
      x.setColumn(0, params.toArray());
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

    public void calcJacobi(RealMatrix jacobi) {
//      jacobi.setZero(csize, params.size());
      for (int j=0; j < pSize(); j++) {
        for (int i=0; i < constraints.size(); i++) {
          jacobi.setEntry(i, j, 0);
        }
      }
      for (int i=0; i < constraints.size(); i++) {
        Constraint c = constraints.get(i);
        double[] grad = new double[c.params().length];
        c.gradient(grad);
        for (int j=0; j < grad.length; j++) {
          jacobi.setEntry(i,j, grad[j]);
        }
      }
    }

    public void setParams(RealMatrix params) {
      int off = 0;
      double[] arr = params.getColumn(0);
      for (Constraint c : constraints) {
        int l = c.params().length;
        double[] cp = new double[l];
        java.lang.System.arraycopy(arr, off, cp, 0, l);
        c.set(cp);
      }
    }
  }
}
