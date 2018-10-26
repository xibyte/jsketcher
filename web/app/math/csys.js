import {AXIS, Matrix3, ORIGIN} from './l3space';

export default class CSys {
  
  static fromNormalAndDir(origin, normal, dir) {
    return new CSys(origin, dir, normal.cross(dir), normal)  
  }
  
  static origin() {
    return new CSys(ORIGIN.copy(), AXIS.X.copy(), AXIS.Y.copy(), AXIS.Z.copy());
  }
  
  constructor(origin, x, y, z) {
    this.origin = origin;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  w() {
    return this.z.dot(this.origin);
  }
  
  get outTransformation() {
    if (!this._outTr) {
      const basis = new Matrix3().setBasis([this.x, this.y, this.z]);
      const translate = new Matrix3();
      basis.tx = this.origin.x;
      basis.ty = this.origin.y;
      basis.tz = this.origin.z;
      this._outTr = basis;//basis.combine(translate);
    }
    return this._outTr;
  }

  get inTransformation() {
    if (!this._inTr) {
      this._inTr = this.outTransformation.invert();
    }
    return this._inTr;
  }
  
  copy(csys) {
    this.origin.setV(csys.origin);
    this.x.setV(csys.x);
    this.y.setV(csys.y);
    this.z.setV(csys.z);
    return this;
  }

  clone() {
    return new CSys(this.origin.copy(), this.x.copy(), this.y.copy(), this.z.copy());
  }

  move(x, y, z) {
    this.origin.set(x, y, z);
    return this;
  }
  
}

CSys.ORIGIN = CSys.origin();

Object.freeze(CSys.ORIGIN.origin);
Object.freeze(CSys.ORIGIN.x);
Object.freeze(CSys.ORIGIN.y);
Object.freeze(CSys.ORIGIN.z);
