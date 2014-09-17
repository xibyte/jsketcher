package cad.math;

import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealMatrix;

/**
 * Created by verastov
 */
public class FullPivLU {


  private boolean m_isInitialized;
  private RealMatrix m_lu;
  private ArrayRealVector m_colsTranspositions;
  private ArrayRealVector m_rowsTranspositions;
  private int number_of_transpositions;
  private int m_nonzero_pivots;
  private double m_maxpivot;

  void compute(RealMatrix matrix)
  {
    // the permutations are stored as int indices, so just to be sure:
    m_isInitialized = true;
    m_lu = matrix;

    int rows = matrix.getRowDimension();
    int cols = matrix.getColumnDimension();
    int size = Math.min(rows, cols);

    // will store the transpositions, before we accumulate them at the end.
    // can't accumulate on-the-fly because that will be done in reverse order for the rows.
    
    m_rowsTranspositions = new ArrayRealVector(rows);
    m_colsTranspositions = new ArrayRealVector(cols);
    number_of_transpositions = 0; // number of NONTRIVIAL transpositions, i.e. m_rowsTranspositions[i]!=i

    m_nonzero_pivots = size; // the generic case is that in which all pivots are nonzero (invertible case)
    m_maxpivot = 0;

    for(int k = 0; k < size; ++k)
    {
      // First, we need to find the pivot.

      // biggest coefficient in the remaining bottom-right corner (starting at row k, col k)
      int row_of_biggest_in_corner, col_of_biggest_in_corner;
      double biggest_in_corner;
      biggest_in_corner = m_lu.bottomRightCorner(rows-k, cols-k)
              .cwiseAbs()
              .maxCoeff(&row_of_biggest_in_corner, &col_of_biggest_in_corner);
      row_of_biggest_in_corner += k; // correct the values! since they were computed in the corner,
      col_of_biggest_in_corner += k; // need to add k to them.

      if(biggest_in_corner==RealScalar(0))
      {
        // before exiting, make sure to initialize the still uninitialized transpositions
        // in a sane state without destroying what we already have.
        m_nonzero_pivots = k;
        for(Index i = k; i < size; ++i)
        {
          m_rowsTranspositions.coeffRef(i) = i;
          m_colsTranspositions.coeffRef(i) = i;
        }
        break;
      }

      if(biggest_in_corner > m_maxpivot) m_maxpivot = biggest_in_corner;

      // Now that we've found the pivot, we need to apply the row/col swaps to
      // bring it to the location (k,k).

      m_rowsTranspositions.coeffRef(k) = row_of_biggest_in_corner;
      m_colsTranspositions.coeffRef(k) = col_of_biggest_in_corner;
      if(k != row_of_biggest_in_corner) {
        m_lu.row(k).swap(m_lu.row(row_of_biggest_in_corner));
        ++number_of_transpositions;
      }
      if(k != col_of_biggest_in_corner) {
        m_lu.col(k).swap(m_lu.col(col_of_biggest_in_corner));
        ++number_of_transpositions;
      }

      // Now that the pivot is at the right location, we update the remaining
      // bottom-right corner by Gaussian elimination.

      if(k<rows-1)
        m_lu.col(k).tail(rows-k-1) /= m_lu.coeff(k,k);
      if(k<size-1)
        m_lu.block(k+1,k+1,rows-k-1,cols-k-1).noalias() -= m_lu.col(k).tail(rows-k-1) * m_lu.row(k).tail(cols-k-1);
    }

    // the main loop is over, we still have to accumulate the transpositions to find the
    // permutations P and Q

    m_p.setIdentity(rows);
    for(Index k = size-1; k >= 0; --k)
      m_p.applyTranspositionOnTheRight(k, m_rowsTranspositions.coeff(k));

    m_q.setIdentity(cols);
    for(Index k = 0; k < size; ++k)
      m_q.applyTranspositionOnTheRight(k, m_colsTranspositions.coeff(k));

    m_det_pq = (number_of_transpositions%2) ? -1 : 1;
    return *this;
  }
  
}
