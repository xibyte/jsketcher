import Vector, {UnitVector} from "math/vector";

export default class Axis {
  origin: Vector;
  direction: UnitVector;

  constructor(origin: Vector, direction: UnitVector) {
    this.origin = origin;
    this.direction = direction;
  }


  copy(axis: Axis) {
    this.origin.setV(axis.origin);
    this.direction.setV(axis.direction);
    return this;
  }

  clone() {
    return new Axis(this.origin.copy(), this.direction.copy());
  }

  move(x, y, z) {
    this.origin.set(x, y, z);
    return this;
  }

  invert() {
    return new Axis(this.origin, this.direction.negate());
  }
}
