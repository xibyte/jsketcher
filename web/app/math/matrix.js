
TCAD.math.Matrix = function(r, c) {
  this.data = [];
  this.rSize = r;
  this.cSize = c;
  for (var i = 0; i < r; i++) {
    this.data[i] = TCAD.math._arr(c)
  }
};

TCAD.math.Matrix.prototype.identity = function() {

  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      this.data[i][j] = i === j ? 1 : 0; 
    }
  }
};

TCAD.math.Matrix.prototype.subtract = function(m) {
  var out = new TCAD.math.Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] - m.data[i][j];
    }
  }
  return out;
};

TCAD.math.Matrix.prototype.add = function(m) {
  var out = new TCAD.math.Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] + m.data[i][j];
    }
  }
  return out;
};

TCAD.math.Matrix.prototype.multiply = function(m) {

  var nRows = this.rSize;
  var nCols = m.cSize;
  var nSum = this.cSize;

  var out = new TCAD.math.Matrix(nRows, nCols);
  
  var outData = out.data;
  // Will hold a column of "m".
  var mCol = TCAD.math._arr(nSum);
  var mData = m.data;

  // Multiply.
  for (var col = 0; col < nCols; col++) {
    // Copy all elements of column "col" of "m" so that
    // will be in contiguous memory.
    for (var mRow = 0; mRow < nSum; mRow++) {
      mCol[mRow] = mData[mRow][col];
    }

    for (var row = 0; row < nRows; row++) {
      var dataRow = this.data[row];
      var sum = 0;
      for (var i = 0; i < nSum; i++) {
        sum += dataRow[i] * mCol[i];
      }
      outData[row][col] = sum;
    }
  }

  return out;
};

TCAD.math.Matrix.prototype.scalarMultiply = function(s) {
  var out = new TCAD.math.Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] * s;
    }
  }
  return out;
};

TCAD.math.Matrix.prototype.transpose = function() {
  var out = new TCAD.math.Matrix(this.cSize, this.rSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[j][i] = this.data[i][j];
    }
  }
  return out;
};

TCAD.math.Matrix.prototype.copy = function() {
  var out = new TCAD.math.Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j];
    }
  }
  return out;
};

TCAD.math.Matrix.prototype.dot = function(v) {
  var vData = v.data;
  var dot = 0;
  for (var i = 0; i < this.rSize; i++) {
    dot += this.data[i][0] * vData[i][0];
  }
  return dot;
};

TCAD.math.Matrix.prototype.norm = function(v) {
  var sum = 0;
  for (var i = 0; i < this.rSize; i++) {
    var a = this.data[i][0];
    sum += a * a;
  }
  return Math.sqrt(sum);
};

TCAD.math.Vector = function(n) {
  TCAD.math.Matrix.call(this, n, 1);
};

TCAD.TWO.utils.extend(TCAD.math.Vector, TCAD.math.Matrix);

