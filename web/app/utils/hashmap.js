function HashTable(hashCodeF, equalsF) {
  this.hashCodeF = hashCodeF;
  this.equalsF = equalsF;
  this.setTableSize(8);
  this.size = 0;
}

HashTable.prototype.hash = function(key) {
  return Math.abs(this.hashCodeF(key) % this.table.length);
};

HashTable.prototype.get = function(key) {
  const entry = this._findEntry(key, this._findBucket(key));
  if (entry == null) return null;
  return entry[1];
};

HashTable.prototype.put = function(key, value) {
  if (this.size >= 0.75 * this.table.length) {
    this.rebuild();
  }
  this._put(key, value);
};

HashTable.prototype._findBucket = function(key) {
  const hash = this.hash(key);
  let bucket = this.table[hash];
  if (bucket === null) {
    bucket = [];
    this.table[hash] = bucket;
  }
  return bucket;
};

HashTable.prototype._findEntry = function(key, bucket) {
  for (let i = 0; i < bucket.length; i++) {
    if (this.equalsF(bucket[i][0], key)) {
      return bucket[i];
    }
  }
  return null;
};

HashTable.prototype._put = function(key, value) {
  const bucket = this._findBucket(key);
  const entry = this._findEntry(key, bucket);
  if (entry == null) {
    bucket.push([key, value]);
  } else {
    entry[1] = value;
  }
  this.size++;
};

HashTable.prototype.rebuild = function() {
  this.size = 0;
  const oldTable = this.table;
  this.setTableSize(this.table.length * 2);
  for (let i = 0; i < oldTable.length; i++) {
    const e = oldTable[i];
    if (e != null)  {
      for (let j = 0; j < e.length; j++) {
        const bucket = e[j];
        this._put(bucket[0], bucket[1]);
      }
    }
  }
};

HashTable.prototype.getKeys = function() {
  const keys = [];
  this.entries(function(k) {
    keys.push(k)
  });
  return keys;
};

HashTable.prototype.entries = function(callback) {
  for (let i = 0; i < this.table.length; i++) {
    const e = this.table[i];
    if (e != null)  {
      for (let j = 0; j < e.length; j++) {
        const bucket = e[j];
        callback(bucket[0], bucket[1]);
      }
    }
  }
};

HashTable.prototype.setTableSize = function(newSize) {
  this.table = [];
  for (let i = 0; i < newSize; i++) {
    this.table[i] = null;
  }
};

function DoubleHelper() {
  this.dv = new DataView(new ArrayBuffer(8));
}

DoubleHelper.prototype.hash = function(v) {
  this.dv.setFloat64(0, v);
  return this.dv.getInt32(0) ^ this.dv.getInt32(4);
};

HashTable.forVector3d = function() {
  const doubleHelper = new DoubleHelper();
  function hash(v) {
    return doubleHelper.hash(v.x) ^ doubleHelper.hash(v.y) ^ doubleHelper.hash(v.z);
  }
  function eq(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }
  return new HashTable(hash, eq);
};

HashTable.forEdge = function() {
  const doubleHelper = new DoubleHelper();
  function hash(v) {
    return doubleHelper.hash(v[0].x) ^ doubleHelper.hash(v[0].y) ^ doubleHelper.hash(v[0].z)
          ^doubleHelper.hash(v[1].x) ^ doubleHelper.hash(v[1].y) ^ doubleHelper.hash(v[1].z);
  }
  function veq(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }
  function eq(e1, e2) {
    const a1 = e1[0];
    const b1 = e1[1];
    const a2 = e2[0];
    const b2 = e2[1];
    return (veq(a1, a2) && veq(b1, b2)) || (veq(a1, b2) && veq(b1, a2));
  }
  return new HashTable(hash, eq);
};

HashTable.forVector2d = function() {
  const doubleHelper = new DoubleHelper();
  function hash(v) {
    return doubleHelper.hash(v.x) ^ doubleHelper.hash(v.y) ;
  }
  function eq(a, b) {
    return a.x === b.x && a.y === b.y;
  }
  return new HashTable(hash, eq);
};

HashTable.forDoubleArray = function() {
  const doubleHelper = new DoubleHelper();
  function hash(v) {
    let hash = 0;
    for (let i = 0; i < v.length; i++) {
      hash ^= v[i];
    }
    return hash;
  }
  function eq(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return new HashTable(hash, eq);
};

export {HashTable, DoubleHelper}
