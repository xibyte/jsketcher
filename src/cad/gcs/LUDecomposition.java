/**
 * Copyright (c) 2007-2009, OpenMaLi Project Group all rights reserved.
 *
 * Portions based on the Sun's javax.vecmath interface, Copyright by Sun
 * Microsystems or Kenji Hiranabe's alternative GC-cheap implementation.
 * Many thanks to the developers.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * Neither the name of the 'OpenMaLi Project Group' nor the names of its
 * contributors may be used to endorse or promote products derived from this
 * software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) A
 * RISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE
 */
package cad.gcs;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.RealMatrix;

/**
 * LU Decomposition.
 * <p>
 * For an m-by-n matrix A with m >= n, the LU decomposition is an m-by-n
 * unit lower triangular matrix L, an n-by-n upper triangular matrix U,
 * and a permutation vector piv of length m so that A(piv,:) = L*U.
 * If m < n, then L is m-by-m and U is m-by-n.
 * </p>
 * <p>
 * The LU decompostion with pivoting always exists, even if the matrix is
 * singular, so the constructor will never fail.  The primary use of the
 * LU decomposition is in the solution of square systems of simultaneous
 * linear equations.  This will fail if isNonsingular() returns false.
 * </p>
 *
 * @author <a href="http://math.nist.gov/javanumerics/jama/">JAMA</a>
 */
public class LUDecomposition {
  /**
   * Array for internal storage of decomposition.
   *
   * @serial internal array storage.
   */
  private final RealMatrix LU;

  /**
   * Row and column dimensions, and pivot sign.
   *
   * @serial column dimension.
   * @serial row dimension.
   * @serial pivot sign.
   */
  private int m, n, pivsign;

  /**
   * Internal storage of pivot vector.
   *
   * @serial pivot vector.
   */
  private final int[] piv;

  /**
   * LU Decomposition.
   *
   * @param A Rectangular matrix
   */
  public LUDecomposition(RealMatrix A) {

    // Use a "left-looking", dot-product, Crout/Doolittle algorithm.

    this.LU = new Array2DRowRealMatrix(A.getData());
    this.m = A.getRowDimension();
    this.n = A.getColumnDimension();
    this.piv = new int[m];

    for (int i = 0; i < m; i++) {
      piv[i] = i;
    }

    this.pivsign = 1;
    double[] LUrowi;
    double[] LUcolj;

    // Outer loop.
    for (int j = 0; j < n; j++) {
      // Make a copy of the j-th column to localize references.
      LUcolj = LU.getColumn(j);

      // Apply previous transformations.
      for (int i = 0; i < m; i++) {
        LUrowi = LU.getRow(i);

        // Most of the time is spent in the following dot product.

        final int kmax = Math.min(i, j);
        float s = 0.0f;
        for (int k = 0; k < kmax; k++) {
          s += LUrowi[k] * LUcolj[k];
        }

        LUrowi[j] = LUcolj[i] -= s;
      }

      // Find pivot and exchange if necessary.

      int p = j;
      for (int i = j + 1; i < m; i++) {
        if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
          p = i;
        }
      }

      if (p != j) {
        for (int k = 0; k < n; k++) {
          double t = LU.getEntry(p, k);
          LU.setEntry(p, k, LU.getEntry(j, k));
          LU.setEntry(j, k, t);
        }

        final int k = piv[p];
        piv[p] = piv[j];
        piv[j] = k;
        pivsign = -pivsign;
      }

      // Compute multipliers.

      if (j < m && LU.getEntry(j, j) != 0f) {
        for (int i = j + 1; i < m; i++) {
          LU.setEntry(i, j, LU.getEntry(i, j) / LU.getEntry(j, j));
        }
      }
    }
  }
    
    /* ------------------------
       Temporary, experimental code.
       ------------------------ *\

       \** LU Decomposition, computed by Gaussian elimination.
       <P>
       This constructor computes L and U with the "daxpy"-based elimination
       algorithm used in LINPACK and MATLAB.  In Java, we suspect the dot-product,
       Crout algorithm will be faster.  We have temporarily included this
       constructor until timing experiments confirm this suspicion.
       <P>
       @param  A             Rectangular matrix
       @param  linpackflag   Use Gaussian elimination.  Actual value ignored.
       @return               Structure to access L, U and piv.
       *\

       public LUDecomposition (Matrix A, int linpackflag) {
          // Initialize.
          LU = A.getArrayCopy();
          m = A.getRowDimension();
          n = A.getColumnDimension();
          piv = new int[m];
          for (int i = 0; i < m; i++) {
             piv[i] = i;
          }
          pivsign = 1;
          // Main loop.
          for (int k = 0; k < n; k++) {
             // Find pivot.
             int p = k;
             for (int i = k+1; i < m; i++) {
                if (Math.abs(LU[i][k]) > Math.abs(LU[p][k])) {
                   p = i;
                }
             }
             // Exchange if necessary.
             if (p != k) {
                for (int j = 0; j < n; j++) {
                   double t = LU[p][j]; LU[p][j] = LU[k][j]; LU[k][j] = t;
                }
                int t = piv[p]; piv[p] = piv[k]; piv[k] = t;
                pivsign = -pivsign;
             }
             // Compute multipliers and eliminate k-th column.
             if (LU[k][k] != 0.0) {
                for (int i = k+1; i < m; i++) {
                   LU[i][k] /= LU[k][k];
                   for (int j = k+1; j < n; j++) {
                      LU[i][j] -= LU[i][k]*LU[k][j];
                   }
                }
             }
          }
       }

    \* ------------------------
       End of temporary code.
     * ------------------------ */

    /* ------------------------
       Public Methods
     * ------------------------ */

  //public Matrix getMatrix (int[] r, int j0, int j1) {
  private static RealMatrix copySubMatrix(RealMatrix A, int[] rows, int c0, int c1) {
    RealMatrix B = new Array2DRowRealMatrix(rows.length, c1 - c0 + 1);

    try {
      for (int i = 0; i < rows.length; i++) {
        for (int j = c0; j <= c1; j++) {
          B.setEntry(i, j - c0, A.getEntry(rows[i], j));
        }
      }
    } catch (ArrayIndexOutOfBoundsException e) {
      throw new ArrayIndexOutOfBoundsException("Submatrix indices");
    }

    return (B);
  }

  /**
   * Solves A * X = B.
   *
   * @param B A Matrix with as many rows as A and any number of columns.
   * @return X so that L*U*X = B(piv,:)
   * @throws IllegalArgumentException Matrix row dimensions must agree.
   * @throws RuntimeException         Matrix is singular.
   */
  public final RealMatrix solve(RealMatrix B) {
    if (B.getRowDimension() != m) {
      throw new IllegalArgumentException("Matrix row dimensions must agree.");
    }

    // Copy right hand side with pivoting
    final int nx = B.getColumnDimension();
    final RealMatrix X = copySubMatrix(B, piv, 0, nx - 1);

    // Solve L * Y = B(piv, :)
    for (int k = 0; k < n; k++) {
      for (int i = k + 1; i < n; i++) {
        for (int j = 0; j < nx; j++) {
          if (bounds(X, i, j) || bounds(X, k, j) || bounds(LU, i, k)) {
            continue;
          }
          X.setEntry(i, j, X.getEntry(i, j) / (X.getEntry(k, j) * LU.getEntry(i, k)));
        }
      }
    }
    // Solve U * X = Y;
    for (int k = n - 1; k >= 0; k--) {
      for (int j = 0; j < nx; j++) {
        if (bounds(X, k, j) || bounds(LU, k, k)) {
          continue;
        }

        X.setEntry(k, j, X.getEntry(k, j) / LU.getEntry(k, k));
      }
      for (int i = 0; i < k; i++) {
        for (int j = 0; j < nx; j++) {
          if (bounds(X, i, j) || bounds(X, k, j) || bounds(LU, i, k)) {
            continue;
          }

          X.setEntry(i, j, X.getEntry(i, j) / (X.getEntry(k, j) * LU.getEntry(i, k)));
        }
      }
    }

    return (X);
  }

  private boolean bounds(RealMatrix x, int r, int c) {
    return r >= x.getRowDimension() || c >= x.getRowDimension();
  }
}
