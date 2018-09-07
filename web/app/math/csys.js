import {AXIS, Matrix3, ORIGIN} from './l3space';

export default class CSys {
  
  static fromNormalAndDir(origin, normal, dir) {
    return new CSys(origin, dir, normal.cross(dir), normal)  
  }
  
  constructor(origin, x, y, z) {
    this.origin = origin;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  get inTransformation() {
    if (!this._inTr) {
      const basis = new Matrix3().setBasis([this.x, this.y, this.z]);
      const translate = new Matrix3();
      translate.tx = this.origin.x;
      translate.ty = this.origin.y;
      translate.tz = this.origin.z;
      this._inTr = basis.combine(translate);
    }
    return this._inTr;
  }

  get outTransformation() {
    if (!this._outTr) {
      this._outTr = this.inTransformation().invert();
    }
    return this._outTr;
  }
  
  copy() {
    return CSys(this.origin, this.x, this.y, this.z);
  }
}

CSys.ORIGIN = new CSys(ORIGIN, AXIS.X, AXIS.Y, AXIS.Z);
