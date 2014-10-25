TCAD.math.qr = function(matrix) {

  function arr(size) {
    var out = [];
    out.length = size;
    for (var i = 0; i < size; ++i) {
      out[i] = 0;
    }
    return out;
  }

  this.qrRankingThreshold = 1e-30; //??
  this.solvedCols  = Math.min(nR, nC);
  this.diagR     = arr(nC);
  this.norm    = arr(nC);
  this.beta    = arr(nC);
  this.permutation = arr(nC);
  this.rank = null;

  var nR = this.matrix.length;
  var nC = this.matrix[0].length;
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
};
