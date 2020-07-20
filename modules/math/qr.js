import {_vec} from "./vec";
import {fillArray} from "gems/iterables";

/** @constructor */
function QR(matrix) {
  var vec = _vec;
  this.matrix = matrix;
  var nR = this.matrix.length;
  var nC = nR == 0 ? 0 : this.matrix[0].length;

  this.qrRankingThreshold = 1e-30; //??
  this.solvedCols  = Math.min(nR, nC);
  this.diagR     = vec(nC);
  this.norm    = vec(nC);
  this.beta    = vec(nC);
  this.permutation = vec(nC);
  this.rank = null;

  var k;
  var norm2;
  var akk;
  var j;
  var i;
  
  // initializations
  for (k = 0; k < nC; ++k) {
    this.permutation[k] = k;
    norm2 = 0;
    for (i = 0; i < nR; ++i) {
      akk = matrix[i][k];
      norm2 += akk * akk;
    }
    this.norm[k] = Math.sqrt(norm2);
  }

  // transform the matrix column after column
  for (k = 0; k < nC; ++k) {

    // select the column with the greatest norm on active components
    var nextColumn = -1;
    var ak2 = Number.NEGATIVE_INFINITY;
    for (i = k; i < nC; ++i) {
      norm2 = 0;
      for (j = k; j < nR; ++j) {
        var aki = matrix[j][this.permutation[i]];
        norm2 += aki * aki;
      }
      if (!isFinite(norm2)) {
        throw "UNABLE_TO_PERFORM_QR_DECOMPOSITION";
      }
      if (norm2 > ak2) {
        nextColumn = i;
        ak2    = norm2;
      }
    }
    if (ak2 <= this.qrRankingThreshold) {
      this.rank = k;
      return;
    }
    var pk          = this.permutation[nextColumn];
    this.permutation[nextColumn] = this.permutation[k];
    this.permutation[k]      = pk;

    // choose alpha such that Hk.u = alpha ek
    akk   = matrix[k][pk];
    var alpha = (akk > 0) ? -Math.sqrt(ak2) : Math.sqrt(ak2);
    var betak = 1.0 / (ak2 - akk * alpha);
    this.beta[pk]   = betak;

    // transform the current column
    this.diagR[pk]    = alpha;
    matrix[k][pk] -= alpha;

    // transform the remaining columns
    for (var dk = nC - 1 - k; dk > 0; --dk) {
      var gamma = 0;
      for (j = k; j < nR; ++j) {
        gamma += matrix[j][pk] * matrix[j][this.permutation[k + dk]];
      }
      gamma *= betak;
      for (j = k; j < nR; ++j) {
        matrix[j][this.permutation[k + dk]] -= gamma * matrix[j][pk];
      }
    }
  }
  this.rank = this.solvedCols;
}

QR.prototype.qTy = function(y) {
  var nR = this.matrix.length;
  var nC = this.matrix[0].length;

  for (var k = 0; k < nC; ++k) {
    var pk = this.permutation[k];
    var gamma = 0;
    for (var i = k; i < nR; ++i) {
      gamma += this.matrix[i][pk] * y[i];
    }
    gamma *= this.beta[pk];
    for (var i = k; i < nR; ++i) {
      y[i] -= gamma * this.matrix[i][pk];
    }
  }
};

QR.prototype.solve = function(qy) {

  var nR = this.matrix.length;
  var nC = this.matrix[0].length;

  var vec = _vec;
  
  var diag = vec(nC);
  var lmDiag = vec(nC);
  var work = vec(nC);
  var out =  vec(nC);
  
  // copy R and Qty to preserve input and initialize s
  //  in particular, save the diagonal elements of R in lmDir
  for (var j = 0; j < this.solvedCols; ++j) {
    var pj = this.permutation[j];
    for (var i = j + 1; i < this.solvedCols; ++i) {
      this.matrix[i][pj] = this.matrix[j][this.permutation[i]];
    }
    out[j] = this.diagR[pj];
    work[j]  = qy[j];
  }

  // eliminate the diagonal matrix d using a Givens rotation
  for (var j = 0; j < this.solvedCols; ++j) {

    // prepare the row of d to be eliminated, locating the
    // diagonal element using p from the Q.R. factorization
    var pj = this.permutation[j];
    var dpj = diag[pj];
    if (dpj != 0) {
      fillArray(lmDiag, j + 1, lmDiag.length, 0);
    }
    lmDiag[j] = dpj;

    //  the transformations to eliminate the row of d
    // modify only a single element of Qty
    // beyond the first n, which is initially zero.
    var qtbpj = 0;
    for (var k = j; k < this.solvedCols; ++k) {
      var pk = this.permutation[k];

      // determine a Givens rotation which eliminates the
      // appropriate element in the current row of d
      if (lmDiag[k] != 0) {

        var sin;
        var cos;
        var rkk = this.matrix[k][pk];
        if (Math.abs(rkk) < Math.abs(lmDiag[k])) {
          var cotan = rkk / lmDiag[k];
          sin   = 1.0 / Math.sqrt(1.0 + cotan * cotan);
          cos   = sin * cotan;
        } else {
          var tan = lmDiag[k] / rkk;
          cos = 1.0 / Math.sqrt(1.0 + tan * tan);
          sin = cos * tan;
        }

        // compute the modified diagonal element of R and
        // the modified element of (Qty,0)
        this.matrix[k][pk] = cos * rkk + sin * lmDiag[k];
        var temp = cos * work[k] + sin * qtbpj;
        qtbpj = -sin * work[k] + cos * qtbpj;
        work[k] = temp;

        // accumulate the tranformation in the row of s
        for (var i = k + 1; i < this.solvedCols; ++i) {
          var rik = this.matrix[i][pk];
          var temp2 = cos * rik + sin * lmDiag[i];
          lmDiag[i] = -sin * rik + cos * lmDiag[i];
          this.matrix[i][pk] = temp2;
        }
      }
    }

    // store the diagonal element of s and restore
    // the corresponding diagonal element of R
    lmDiag[j] = this.matrix[j][this.permutation[j]];
    this.matrix[j][this.permutation[j]] = out[j];
  }

  // solve the triangular system for z, if the system is
  // singular, then obtain a least squares solution
  var nSing = this.solvedCols;
  for (var j = 0; j < this.solvedCols; ++j) {
    if ((lmDiag[j] == 0) && (nSing == this.solvedCols)) {
      nSing = j;
    }
    if (nSing < this.solvedCols) {
      work[j] = 0;
    }
  }
  if (nSing > 0) {
    for (var j = nSing - 1; j >= 0; --j) {
      var pj = this.permutation[j];
      var sum = 0;
      for (var i = j + 1; i < nSing; ++i) {
        sum += this.matrix[i][pj] * work[i];
      }
      work[j] = (work[j] - sum) / lmDiag[j];
    }
  }

  // permute the components of z back to components of lmDir
  for (var j = 0; j < out.length; ++j) {
    out[this.permutation[j]] = work[j];
  }
  return out;
};

export default QR