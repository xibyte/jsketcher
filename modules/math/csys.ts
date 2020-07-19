import Vector, {AXIS, ORIGIN} from "math/vector";
import {Matrix3x4} from "math/matrix";

export default class CSys {

  static ORIGIN: CSys;

  origin: Vector;
  x: Vector;
  y: Vector;
  z: Vector;
  private _outTr: Matrix3x4;
  private _inTr: Matrix3x4;

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

  get outTransformation3x3() {
    return new Matrix3x4().setBasisAxises(this.x, this.y, this.z);
  }

  get outTransformation() {
    const mx = new Matrix3x4().setBasisAxises(this.x, this.y, this.z);
    mx.tx = this.origin.x;
    mx.ty = this.origin.y;
    mx.tz = this.origin.z;
    return mx;
  }

  get inTransformation3x3() {
    return this.outTransformation3x3.invert();
  }

  get inTransformation() {
    return this.outTransformation.invert();
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

  invert() {
    const tr = this.inTransformation;
    return new CSys(
      new Vector(tr.tx,  tr.ty,  tr.tz),
      new Vector(tr.mxx, tr.myx, tr.mzx),
      new Vector(tr.mxy, tr.myy, tr.mzy),
      new Vector(tr.mxz, tr.myz, tr.mzz)
    );
  }
}

CSys.ORIGIN = CSys.origin();

Object.freeze(CSys.ORIGIN.origin);
Object.freeze(CSys.ORIGIN.x);
Object.freeze(CSys.ORIGIN.y);
Object.freeze(CSys.ORIGIN.z);
