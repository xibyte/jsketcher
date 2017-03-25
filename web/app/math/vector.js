import {vectorsEqual} from './math'

/** @constructor */
function Vector(x, y, z) {
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
}

Vector.prototype.set = function(x, y, z) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
  return this;
};

Vector.prototype.set3 = function(data) {
  this.x = data[0];
  this.y = data[1];
  this.z = data[2];
  return this;
};

Vector.prototype.setV = function(data) {
  this.x = data.x;
  this.y = data.y;
  this.z = data.z;
  return this;
};

Vector.prototype.multiply = function(scalar) {
  return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
};

Vector.prototype._multiply = function(scalar) {
  return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
};

Vector.prototype.dot = function(vector) {
  return this.x * vector.x + this.y * vector.y + this.z * vector.z;
};

Vector.prototype.copy = function() {
  return new Vector(this.x, this.y, this.z);
};

Vector.prototype.length = function() {
  return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
};

Vector.prototype.lengthSquared = function() {
  return this.dot(this);
};

Vector.prototype.distanceToSquared = function(a) {
  return this.minus(a).lengthSquared();
};

Vector.prototype.minus = function(vector) {
  return new Vector(this.x - vector.x, this.y - vector.y, this.z - vector.z);
};

Vector.prototype._minus = function(vector) {
  this.x -= vector.x;
  this.y -= vector.y;
  this.z -= vector.z;
  return this;
};

Vector.prototype._minusXYZ = function(x, y, z) {
  this.x -= x;
  this.y -= y;
  this.z -= z;
  return this;
};

Vector.prototype.plusXYZ = function(x, y, z) {
  return new Vector(this.x + x, this.y + y, this.z + z);
};

Vector.prototype.plus = function(vector) {
  return new Vector(this.x + vector.x, this.y + vector.y, this.z + vector.z);
};

Vector.prototype._plus = function(vector) {
  this.x += vector.x;
  this.y += vector.y;
  this.z += vector.z;
  return this;
};

Vector.prototype.normalize = function() {
  var mag = this.length();
  if (mag == 0.0) {
    return new Vector(0.0, 0.0, 0.0);
  }
  return new Vector(this.x / mag, this.y / mag, this.z / mag);
};


Vector.prototype._normalize = function() {
  var mag = this.length();
  if (mag == 0.0) {
    return this.set(0, 0, 0)
  }
  return this.set(this.x / mag, this.y / mag, this.z / mag)
};

Vector.prototype.cross = function(a) {
  return new Vector(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
  );
};

Vector.prototype.negate = function() {
  return this.multiply(-1);
};

Vector.prototype._negate = function() {
  return this._multiply(-1);
};

Vector.prototype.equals = function(vector) {
  return vectorsEqual(this, vector);
};

Vector.prototype.toArray = function() {
  return [this.x, this.y, this.z];
};

Vector.prototype.three = function() {
  return new THREE.Vector3(this.x, this.y, this.z);
};

export default Vector;