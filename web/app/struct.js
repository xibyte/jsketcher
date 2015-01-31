TCAD.struct = {};


TCAD.struct.stringEq = function(s1, s2) {
  return s1 === s2;    
};

TCAD.struct.stringHash = function(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = 31 * h + s.charAt(i);
  }
  return h;
};

TCAD.struct.HashTable = function(equals, hashCode) {
  this.equals = equals;
  this.hashCode = hashCode;
  this.table = this._arr(8);
  this.used = 0;
};

TCAD.struct.HashTable.prototype._hash = function(e) {
  return this.hashCode(e);
};

TCAD.struct.HashTable.prototype._index = function(e) {
  var hash = this._hash(e);
  return hash % (this.table.length - 1);
};

TCAD.struct.HashTable.prototype._arr = function(size) {
  var out = [];
  out.length = size;
  for (var i = 0; i < size; ++i) {
    out[i] = null;
  }
  return out;
};

TCAD.struct.HashTable.prototype._rebuild = function(size) {
  var old = this.table;
  this.table = this._arr(size);
  for (var j = 0; j < old.length; ++j) {
    var e = old[j];
    if (e === null) continue;
    var idx = this._index(e[0]);
    for (var i = idx; i < this.table.length; ++ i) {
      if (this.table[i] === null) {
        this.table[i] = e;
      }
    }
  }
};

TCAD.struct.HashTable.prototype.put = function(key, value) {
  var n_used = this.used;
  this._put(key, value);
  if (!(this.used > n_used && this.used * 3 >= (this.table.length) * 2)) {
    return;
  }
  this._rebuild((this.used > 50000 ? 2 : 4) * used);
};

TCAD.struct.HashTable.prototype._put = function(key, value) {
  var idx = this._index(key);
  for (var i = idx; i < this.table.length; ++ i) {
    var e = this.table[i];
    if (e === null) {
      this.table[i] = [key, value];
      this.used ++;
    }
    if (this.equals(e[0], key)) {
      e[1] = value;
    }
  }
};

TCAD.struct.HashTable.prototype.get = function(key) {
  var idx = this._index(key);
  for (var i = idx; i < this.table.length; ++ i) {
    var e = this.table[i];
    if (e === null) {
      return null;
    }
    if (this.equals(e[0], key)) {
      return e[1];
    }
  }
};



