
export default class Vector {

  constructor(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  set(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    return this;
  }

  set3(data) {
    this.x = data[0] || 0;
    this.y = data[1] || 0;
    this.z = data[2] || 0;
    return this;
  }

  setV(data) {
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
    return this;
  }

  multiply(scalar) {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  _multiply(scalar) {
    return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar) {
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  _divide(scalar) {
    return this.set(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  dot(vector) {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  copy() {
    return new Vector(this.x, this.y, this.z);
  }

  length() {
    return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
  };

  lengthSquared() {
    return this.dot(this);
  }

  distanceToSquared(a) {
    return this.minus(a).lengthSquared();
  }

  minus(vector) {
    return new Vector(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  _minus(vector) {
    this.x -= vector.x;
    this.y -= vector.y;
    this.z -= vector.z;
    return this;
  }

  _minusXYZ(x, y, z) {
    this.x -= x;
    this.y -= y;
    this.z -= z;
    return this;
  }

  plusXYZ(x, y, z) {
    return new Vector(this.x + x, this.y + y, this.z + z);
  }

  plus(vector) {
    return new Vector(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  _plus(vector) {
    this.x += vector.x;
    this.y += vector.y;
    this.z += vector.z;
    return this;
  }

  normalize() {
    let mag = this.length();
    if (mag === 0.0) {
      return new Vector(0.0, 0.0, 0.0);
    }
    return new Vector(this.x / mag, this.y / mag, this.z / mag);
  }

  _normalize() {
    let mag = this.length();
    if (mag === 0.0) {
      return this.set(0, 0, 0)
    }
    return this.set(this.x / mag, this.y / mag, this.z / mag)
  };

  cross(a) {
    return new Vector(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
    );
  };

  negate() {
    return this.multiply(-1);
  }

  _negate() {
    return this._multiply(-1);
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  copyToData(data) {
    data[0] = this.x;
    data[1] = this.y;
    data[2] = this.z;
  }
  
  static fromData(arr) {
    return new Vector().set3(arr);
  }
}

Vector.prototype.data = Vector.prototype.toArray;

Vector.prototype.unit = Vector.prototype.normalize;
Vector.prototype._unit = Vector.prototype._normalize;

Vector.prototype.scale = Vector.prototype.multiply;
Vector.prototype._scale = Vector.prototype._multiply;
