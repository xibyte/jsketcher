// levenberg-marquardt in java 
//
// To use this, implement the functions in the LMfunc interface.
//
// This library uses simple matrix routines from the JAMA java matrix package,
// which is in the public domain.  Reference:
//    http://math.nist.gov/javanumerics/jama/
// (JAMA has a matrix object class.  An earlier library JNL, which is no longer
// available, represented matrices as low-level arrays.  Several years 
// ago the performance of JNL matrix code was better than that of JAMA,
// though improvements in java compilers may have fixed this by now.)
//
// One further recommendation would be to use an inverse based
// on Choleski decomposition, which is easy to implement and
// suitable for the symmetric inverse required here.  There is a choleski
// routine at idiom.com/~zilla.
//
// If you make an improved version, please consider adding your
// name to it ("modified by ...") and send it back to me
// (and put it on the web).
//
// ----------------------------------------------------------------
// 
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Library General Public
// License as published by the Free Software Foundation; either
// version 2 of the License, or (at your option) any later version.
// 
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Library General Public License for more details.
// 
// You should have received a copy of the GNU Library General Public
// License along with this library; if not, write to the
// Free Software Foundation, Inc., 59 Temple Place - Suite 330,
// Boston, MA  02111-1307, USA.
//
// initial author contact info:  
// jplewis  www.idiom.com/~zilla  zilla # computer.org,   #=at
//
// Improvements by:
// dscherba  www.ncsa.uiuc.edu/~dscherba  
// Jonathan Jackson   j.jackson # ucl.ac.uk


package cad.gcs;

// see comment above

import Jama.*;

/**
 * Levenberg-Marquardt, implemented from the general description
 * in Numerical Recipes (NR), then tweaked slightly to mostly
 * match the results of their code.
 * Use for nonlinear least squares assuming Gaussian errors.
 * <p>
 * TODO this holds some parameters fixed by simply not updating them.
 * this may be ok if the number if fixed parameters is small,
 * but if the number of varying parameters is larger it would
 * be more efficient to make a smaller hessian involving only
 * the variables.
 * <p>
 * The NR code assumes a statistical context, e.g. returns
 * covariance of parameter errors; we do not do this.
 */
public final class LM {

  /**
   * calculate the current sum-squared-error
   * (Chi-squared is the distribution of squared Gaussian errors,
   * thus the name)
   */
  static double chiSquared(double[] a, double[] y, double[] s,
                           LMfunc f) {
    int npts = y.length;
    double sum = 0.;

    double[] val = f.val(a);
    for (int i = 0; i < npts; i++) {
      double d = y[i] - val[i];
      d = d / s[i];
      sum = sum + (d * d);
    }

    return sum;
  } //chiSquared


  /**
   * Minimize E = sum {(y[k] - f(x[k],a)) / s[k]}^2
   * The individual errors are optionally scaled by s[k].
   * Note that LMfunc implements the value and gradient of f(x,a),
   * NOT the value and gradient of E with respect to a!
   *
   * @param y           corresponding array of values
   * @param a           the parameters/state of the model
   * @param vary        false to indicate the corresponding a[k] is to be held fixed
   * @param s           sigma^2 for point i
   * @param lambda      blend between steepest descent (lambda high) and
   *                    jump to bottom of quadratic (lambda zero).
   *                    Start with 0.001.
   * @param termepsilon termination accuracy (0.01)
   * @param maxiter     stop and return after this many iterations if not done
   * @param verbose     set to zero (no prints), 1, 2
   * @return the new lambda for future iterations.
   * Can use this and maxiter to interleave the LM descent with some other
   * task, setting maxiter to something small.
   */
  public static double solve(double[] a, double[] y, double[] s,
                             boolean[] vary, LMfunc f,
                             double lambda, double termepsilon, int maxiter,
                             int verbose)
          throws Exception {
    int npts = y.length;
    int nparm = a.length;
    assert s.length == npts;
    if (verbose > 0) {
      out().print(" a[" + a.length + "]");
      out().println(" y[" + y.length + "]");
    }

    double e0 = chiSquared(a, y, s, f);
    //double lambda = 0.001;
    boolean done = false;

    // g = gradient, H = hessian, d = step to minimum
    // H d = -g, solve for d
    double[][] H = new double[nparm][nparm];
    double[] g = new double[nparm];
    //double[] d = new double[nparm];

    double[] oos2 = new double[s.length];
    for (int i = 0; i < npts; i++) {
      oos2[i] = 1. / (s[i] * s[i]);
    }

    int iter = 0;
    int term = 0;  // termination count test

    do {
      ++iter;

      // hessian approximation
      for (int r = 0; r < nparm; r++) {
        for (int c = 0; c < nparm; c++) {
          for (int i = 0; i < npts; i++) {
            if (i == 0) {
              H[r][c] = 0.;
            }
            double[] grad = f.grad(a);
            H[r][c] += (oos2[i] * grad[r] * grad[c]);
          }  //npts
        } //c
      } //r

      // boost diagonal towards gradient descent
      for (int r = 0; r < nparm; r++) {
        H[r][r] *= (1. + lambda);
      }

      // gradient
      for (int r = 0; r < nparm; r++) {
        for (int i = 0; i < npts; i++) {
          if (i == 0) {
            g[r] = 0.;
          }
          double[] grad = f.grad(a);
          double[] val = f.val(a);
          g[r] += (oos2[i] * (y[i] - val[i]) * grad[r]);
        }
      } //npts

      // scale (for consistency with NR, not necessary)
      if (false) {
        for (int r = 0; r < nparm; r++) {
          g[r] = -0.5 * g[r];
          for (int c = 0; c < nparm; c++) {
            H[r][c] *= 0.5;
          }
        }
      }

      // solve H d = -g, evaluate error at new location
      //double[] d = DoubleMatrix.solve(H, g);
      double[] d = (new Matrix(H)).lu().solve(new Matrix(g, nparm)).getRowPackedCopy();
      //double[] na = DoubleVector.add(a, d);
      double[] na = (new Matrix(a, nparm)).plus(new Matrix(d, nparm)).getRowPackedCopy();
      double e1 = chiSquared(na, y, s, f);

      if (verbose > 0) {
        out().println("\n\niteration " + iter + " lambda = " + lambda);
        out().print("a = ");
        (new Matrix(a, nparm)).print(10, 2);
        if (verbose > 1) {
          out().print("H = ");
          (new Matrix(H)).print(10, 2);
          out().print("g = ");
          (new Matrix(g, nparm)).print(10, 2);
          out().print("d = ");
          (new Matrix(d, nparm)).print(10, 2);
        }
        out().print("e0 = " + e0 + ": ");
        out().print("moved from ");
        (new Matrix(a, nparm)).print(10, 2);
        out().print("e1 = " + e1 + ": ");
        if (e1 < e0) {
          out().print("to ");
          (new Matrix(na, nparm)).print(10, 2);
        } else {
          out().println("move rejected");
        }
      }

      // termination test (slightly different than NR)
      if (Math.abs(e1 - e0) > termepsilon) {
        term = 0;
      } else {
        term++;
        if (term == 4) {
          out().println("terminating after " + iter + " iterations");
          done = true;
        }
      }
      if (iter >= maxiter) {
        done = true;
      }

      // in the C++ version, found that changing this to e1 >= e0
      // was not a good idea.  See comment there.
      //
      if (e1 > e0 || Double.isNaN(e1)) { // new location worse than before
        lambda *= 10.;
      } else {    // new location better, accept new parameters
        lambda *= 0.1;
        e0 = e1;
        // simply assigning a = na will not get results copied back to caller
        for (int i = 0; i < nparm; i++) {
          if (vary[i]) {
            a[i] = na[i];
          }
        }
      }

    } while (!done);

    return lambda;
  } //solve

  private static java.io.PrintStream out() {
    return java.lang.System.out; 
  }

  //----------------------------------------------------------------
} //LM
