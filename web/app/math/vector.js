
/** @constructor */
TCAD.Vector = function(x, y, z) {
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
};

TCAD.Vector.prototype.set = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

TCAD.Vector.prototype.set3 = function(data) {
  this.x = data[0];
  this.y = data[1];
  this.z = data[2];
  return this;
};

TCAD.Vector.prototype.setV = function(data) {
  this.x = data.x;
  this.y = data.y;
  this.z = data.z;
  return this;
};

TCAD.Vector.prototype.multiply = function(scalar) {
  return new TCAD.Vector(this.x * scalar, this.y * scalar, this.z * scalar);
};

TCAD.Vector.prototype._multiply = function(scalar) {
  return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
};

TCAD.Vector.prototype.dot = function(vector) {
  return this.x * vector.x + this.y * vector.y + this.z * vector.z;
};

TCAD.Vector.prototype.copy = function() {
  return new TCAD.Vector(this.x, this.y, this.z);
};

TCAD.Vector.prototype.length = function() {
  return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
};

TCAD.Vector.prototype.minus = function(vector) {
  return new TCAD.Vector(this.x - vector.x, this.y - vector.y, this.z - vector.z);
};

TCAD.Vector.prototype._minus = function(vector) {
  this.x -= vector.x;
  this.y -= vector.y;
  this.z -= vector.z;
  return this;
};

TCAD.Vector.prototype._minusXYZ = function(x, y, z) {
  this.x -= x;
  this.y -= y;
  this.z -= z;
  return this;
};

TCAD.Vector.prototype.plus = function(vector) {
  return new TCAD.Vector(this.x + vector.x, this.y + vector.y, this.z + vector.z);
};

TCAD.Vector.prototype._plus = function(vector) {
  this.x += vector.x;
  this.y += vector.y;
  this.z += vector.z;
  return this;
};

TCAD.Vector.prototype.normalize = function() {
  var mag = this.length();
  if (mag == 0.0) {
    return new TCAD.Vector(0.0, 0.0, 0.0);
  }
  return new TCAD.Vector(this.x / mag, this.y / mag, this.z / mag);
};


TCAD.Vector.prototype._normalize = function() {
  var mag = this.length();
  if (mag == 0.0) {
    return this.set(0, 0, 0)
  }
  return this.set(this.x / mag, this.y / mag, this.z / mag)
};

TCAD.Vector.prototype.cross = function(a) {
  return new TCAD.Vector(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
  );
};

TCAD.Vector.prototype.negate = function() {
  return this.multiply(-1);
};

TCAD.Vector.prototype._negate = function() {
  return this._multiply(-1);
};

TCAD.Vector.prototype.equals = function(vector) {
  return TCAD.utils.vectorsEqual(this, vector);
};

TCAD.Vector.prototype.three = function() {
  return new THREE.Vector3(this.x, this.y, this.z);
};

/** @constructor */
TCAD.Matrix = function() {
  this.reset();
};

TCAD.Matrix.prototype.reset = function() {
  this.mxx = 1; this.mxy = 0; this.mxz = 0; this.tx = 0;
  this.myx = 0; this.myy = 1; this.myz = 0; this.ty = 0;
  this.mzx = 0; this.mzy = 0; this.mzz = 1; this.tz = 0;
  return this;
};

TCAD.Matrix.prototype.setBasis = function(basis) {
  var b = basis;
  this.mxx = b[0].x; this.mxy = b[1].x; this.mxz = b[2].x; this.tx = 0;
  this.myx = b[0].y; this.myy = b[1].y; this.myz = b[2].y; this.ty = 0;
  this.mzx = b[0].z; this.mzy = b[1].z; this.mzz = b[2].z; this.tz = 0;
  return this;
};

TCAD.Matrix.prototype.set3 = function(
    mxx, mxy, mxz,
    myx, myy, myz,
    mzx, mzy, mzz
    ) {
  this.mxx = mxx; this.mxy = mxy; this.mxz = mxz;
  this.myx = myx; this.myy = myy; this.myz = myz;
  this.mzx = mzx; this.mzy = mzy; this.mzz = mzz;
  return this;
};

TCAD.Matrix.prototype.set34 = function(
    mxx, mxy, mxz, tx,
    myx, myy, myz, ty,
    mzx, mzy, mzz, tz
    ) {
  this.mxx = mxx; this.mxy = mxy; this.mxz = mxz; this.tx = tx;
  this.myx = myx; this.myy = myy; this.myz = myz; this.ty = ty;
  this.mzx = mzx; this.mzy = mzy; this.mzz = mzz; this.tz = tz;
  return this;
};

TCAD.Matrix.prototype.setMatrix = function(m) {
  this.mxx = m.mxx; this.mxy = m.mxy; this.mxz = m.mxz; this.tx = m.tx;
  this.myx = m.myx; this.myy = m.myy; this.myz = m.myz; this.ty = m.ty;
  this.mzx = m.mzx; this.mzy = m.mzy; this.mzz = m.mzz; this.tz = m.tz;
  return this;
};

TCAD.Matrix.prototype.invert = function() {

  var det =
      this.mxx * (this.myy * this.mzz - this.mzy * this.myz) +
      this.mxy * (this.myz * this.mzx - this.mzz * this.myx) +
      this.mxz * (this.myx * this.mzy - this.mzx * this.myy);

  if (det == 0.0) {
    return null;
  }

  var cxx =   this.myy * this.mzz - this.myz * this.mzy;
  var cyx = - this.myx * this.mzz + this.myz * this.mzx;
  var czx =   this.myx * this.mzy - this.myy * this.mzx;
  var cxt = - this.mxy * (this.myz * this.tz - this.mzz  * this.ty)
      - this.mxz * (this.ty  * this.mzy - this.tz  * this.myy)
      - this.tx  * (this.myy * this.mzz - this.mzy * this.myz);
  var cxy = - this.mxy * this.mzz + this.mxz * this.mzy;
  var cyy =   this.mxx * this.mzz - this.mxz * this.mzx;
  var czy = - this.mxx * this.mzy + this.mxy * this.mzx;
  var cyt =   this.mxx * (this.myz * this.tz  - this.mzz * this.ty)
      + this.mxz * (this.ty  * this.mzx - this.tz  * this.myx)
      + this.tx  * (this.myx * this.mzz - this.mzx * this.myz);
  var cxz =   this.mxy * this.myz - this.mxz * this.myy;
  var cyz = - this.mxx * this.myz + this.mxz * this.myx;
  var czz =   this.mxx * this.myy - this.mxy * this.myx;
  var czt = - this.mxx * (this.myy * this.tz - this.mzy  * this.ty)
      - this.mxy * (this.ty  * this.mzx - this.tz  * this.myx)
      - this.tx  * (this.myx * this.mzy - this.mzx * this.myy);

  var result = new TCAD.Matrix();
  result.mxx = cxx / det;
  result.mxy = cxy / det;
  result.mxz = cxz / det;
  result.tx = cxt / det;
  result.myx = cyx / det;
  result.myy = cyy / det;
  result.myz = cyz / det;
  result.ty = cyt / det;
  result.mzx = czx / det;
  result.mzy = czy / det;
  result.mzz = czz / det;
  result.tz = czt / det;
  return result;
};

TCAD.Matrix.prototype.combine = function(transform) {
  var txx = transform.mxx;
  var txy = transform.mxy;
  var txz = transform.mxz;
  var ttx = transform.tx;
  var tyx = transform.myx;
  var tyy = transform.myy;
  var tyz = transform.myz;
  var tty = transform.ty;
  var tzx = transform.mzx;
  var tzy = transform.mzy;
  var tzz = transform.mzz;
  var ttz = transform.tz;

  var m = new TCAD.Matrix();
  m.mxx = (this.mxx * txx + this.mxy * tyx + this.mxz * tzx);
  m.mxy = (this.mxx * txy + this.mxy * tyy + this.mxz * tzy);
  m.mxz = (this.mxx * txz + this.mxy * tyz + this.mxz * tzz);
  m.tx  = (this.mxx * ttx + this.mxy * tty + this.mxz * ttz + this.tx);
  m.myx = (this.myx * txx + this.myy * tyx + this.myz * tzx);
  m.myy = (this.myx * txy + this.myy * tyy + this.myz * tzy);
  m.myz = (this.myx * txz + this.myy * tyz + this.myz * tzz);
  m.ty  = (this.myx * ttx + this.myy * tty + this.myz * ttz + this.ty);
  m.mzx = (this.mzx * txx + this.mzy * tyx + this.mzz * tzx);
  m.mzy = (this.mzx * txy + this.mzy * tyy + this.mzz * tzy);
  m.mzz = (this.mzx * txz + this.mzy * tyz + this.mzz * tzz);
  m.tz  = (this.mzx * ttx + this.mzy * tty + this.mzz * ttz + this.tz);

  return m;
};

TCAD.Matrix.prototype.apply = function(vector) {
  return this.__apply(vector, new TCAD.Vector())
};

TCAD.Matrix.prototype._apply = function(vector) {
  return this.__apply(vector, vector);
};

TCAD.Matrix.prototype.__apply = function(vector, out) {
  var x = vector.x;
  var y = vector.y;
  var z = vector.z;
  return out.set(
      this.mxx * x + this.mxy * y + this.mxz * z + this.tx,
      this.myx * x + this.myy * y + this.myz * z + this.ty,
      this.mzx * x + this.mzy * y + this.mzz * z + this.tz);
};
