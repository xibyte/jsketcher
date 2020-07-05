import {clamp} from "../../web/app/math/math";

export default class Vector {

  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  set(x, y, z): Vector {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    return this;
  }

  set3(data: [number, number, number]): Vector {
    this.x = data[0] || 0;
    this.y = data[1] || 0;
    this.z = data[2] || 0;
    return this;
  }

  setV(data: Vector): Vector {
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
    return this;
  }

  multiply(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  _multiply(scalar: number): Vector {
    return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number): Vector {
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  _divide(scalar: number): Vector {
    return this.set(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  dot(vector: Vector): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  copy(): Vector {
    return new Vector(this.x, this.y, this.z);
  }

  length(): number {
    return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
  };

  lengthSquared(): number {
    return this.dot(this);
  }

  distanceToSquared(a: Vector): number {
    return this.minus(a).lengthSquared();
  }

  distanceTo(a: Vector): number {
    return Math.sqrt(this.distanceToSquared(a));
  }

  minus(vector: Vector): Vector {
    return new Vector(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  _minus(vector: Vector): Vector {
    this.x -= vector.x;
    this.y -= vector.y;
    this.z -= vector.z;
    return this;
  }

  _minusXYZ(x, y, z): Vector {
    this.x -= x;
    this.y -= y;
    this.z -= z;
    return this;
  }

  plusXYZ(x, y, z): Vector {
    return new Vector(this.x + x, this.y + y, this.z + z);
  }

  plus(vector: Vector): Vector {
    return new Vector(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  _plus(vector: Vector): Vector {
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

  cross(a: Vector): Vector {
    return this.copy()._cross(a);
  };

  _cross(a: Vector): Vector {
    return this.set(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
    );
  };

  negate(): Vector {
    return this.multiply(-1);
  }

  _negate(): Vector {
    return this._multiply(-1);
  }

  _perpXY(): Vector {
    return this.set(-this.y, this.x, this.z);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  copyToData(data) {
    data[0] = this.x;
    data[1] = this.y;
    data[2] = this.z;
  }

  angleBetween(vecB: Vector) {
    const cosA = clamp(this.dot(vecB), -1, 1);
    const sinA = clamp(this.cross(vecB).length(), -1, 1);
    return Math.atan2(sinA, cosA);
  }
  
  static fromData(arr: [number, number, number]): Vector {
    return new Vector().set3(arr);
  }

  data: () => [number, number, number] = Vector.prototype.toArray;

  unit: () => (Vector) = Vector.prototype.normalize;
  _unit: () => (Vector) = Vector.prototype._normalize;
  scale: (scalar: number) => Vector = Vector.prototype.multiply;
  _scale: (scalar: number) => Vector = Vector.prototype._multiply;
}
