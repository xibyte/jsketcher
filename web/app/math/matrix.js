import * as math from 'math'

/**
 *  @constructor
 *  @deprecated use numeric library
 * */
export function Matrix(r, c) {
  this.data = [];
  this.rSize = r;
  this.cSize = c;
  for (var i = 0; i < r; i++) {
    this.data[i] = math._vec(c)
  }
}

Matrix.prototype.identity = function() {

  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      this.data[i][j] = i === j ? 1 : 0; 
    }
  }
};

Matrix.prototype.subtract = function(m) {
  var out = new Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] - m.data[i][j];
    }
  }
  return out;
};

Matrix.prototype.add = function(m) {
  var out = new Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] + m.data[i][j];
    }
  }
  return out;
};

Matrix.prototype.multiply = function(m) {

  var nRows = this.rSize;
  var nCols = m.cSize;
  var nSum = this.cSize;

  var out = new Matrix(nRows, nCols);
  
  var outData = out.data;
  var mCol = math._vec(nSum);
  var mData = m.data;

  for (var col = 0; col < nCols; col++) {
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

Matrix.prototype.scalarMultiply = function(s) {
  var out = new Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j] * s;
    }
  }
  return out;
};

Matrix.prototype.transpose = function() {
  var out = new Matrix(this.cSize, this.rSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[j][i] = this.data[i][j];
    }
  }
  return out;
};

Matrix.prototype.copy = function() {
  var out = new Matrix(this.rSize, this.cSize);
  for (var i = 0; i < this.rSize; i++) {
    for (var j = 0; j < this.cSize; j++) {
      out.data[i][j] = this.data[i][j];
    }
  }
  return out;
};

Matrix.prototype.dot = function(v) {
  var vData = v.data;
  var dot = 0;
  for (var i = 0; i < this.rSize; i++) {
    dot += this.data[i][0] * vData[i][0];
  }
  return dot;
};

Matrix.prototype.norm = function(v) {
  var sum = 0;
  for (var i = 0; i < this.rSize; i++) {
    var a = this.data[i][0];
    sum += a * a;
  }
  return Math.sqrt(sum);
};
