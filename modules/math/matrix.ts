import Vector, {AXIS} from "math/vector";
import {Vec3} from "math/vec";

export type Matrix3x4Data = [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
export type Matrix3x4FlatData = [number, number, number, number, number, number, number, number, number, number, number, number];

export class Matrix3x4 {

  mxx: number = 1;
  mxy: number = 0;
  mxz: number = 0;
  tx: number = 0;
  myx: number = 0;
  myy: number = 1;
  myz: number = 0;
  ty: number = 0;
  mzx: number = 0;
  mzy: number = 0;
  mzz: number = 1;
  tz: number = 0;

  reset(): Matrix3x4 {
    this.mxx = 1;
    this.mxy = 0;
    this.mxz = 0;
    this.tx = 0;
    this.myx = 0;
    this.myy = 1;
    this.myz = 0;
    this.ty = 0;
    this.mzx = 0;
    this.mzy = 0;
    this.mzz = 1;
    this.tz = 0;
    return this;
  };

  setBasis(basis: [Vector, Vector, Vector]): Matrix3x4 {
    var b = basis;
    this.mxx = b[0].x;
    this.mxy = b[1].x;
    this.mxz = b[2].x;
    this.tx = 0;
    this.myx = b[0].y;
    this.myy = b[1].y;
    this.myz = b[2].y;
    this.ty = 0;
    this.mzx = b[0].z;
    this.mzy = b[1].z;
    this.mzz = b[2].z;
    this.tz = 0;
    return this;
  };

  setBasisAxises(x: Vector, y: Vector, z: Vector): Matrix3x4 {
    this.mxx = x.x;
    this.mxy = y.x;
    this.mxz = z.x;
    this.tx = 0;
    this.myx = x.y;
    this.myy = y.y;
    this.myz = z.y;
    this.ty = 0;
    this.mzx = x.z;
    this.mzy = y.z;
    this.mzz = z.z;
    this.tz = 0;
    return this;
  };

  setBasisAndTranslation(basis: [Vector, Vector, Vector], translation: Vector): Matrix3x4 {
    this.setBasis(basis);
    this.tx = translation.x;
    this.ty = translation.y;
    this.tz = translation.z;
    return this;
  };

  scale(dx: number, dy: number, dz: number): Matrix3x4 {
    this.mxx *= dx;
    this.myy *= dy;
    this.mzz *= dz;
    return this;
  };

  translate(dx: number, dy: number, dz: number): Matrix3x4 {
    this.tx += dx;
    this.ty += dy;
    this.tz += dz;
    return this;
  };

  translateVec({x, y, z}: Vector): Matrix3x4 {
    this.tx += x;
    this.ty += y;
    this.tz += z;
    return this;
  };

  set3x3(
    mxx: number, mxy: number, mxz: number,
    myx: number, myy: number, myz: number,
    mzx: number, mzy: number, mzz: number
  ): Matrix3x4 {
    this.mxx = mxx;
    this.mxy = mxy;
    this.mxz = mxz;
    this.myx = myx;
    this.myy = myy;
    this.myz = myz;
    this.mzx = mzx;
    this.mzy = mzy;
    this.mzz = mzz;
    return this;
  };

  set3x4(
    mxx: number, mxy: number, mxz: number, tx: number,
    myx: number, myy: number, myz: number, ty: number,
    mzx: number, mzy: number, mzz: number, tz: number
  ): Matrix3x4 {
    this.mxx = mxx;
    this.mxy = mxy;
    this.mxz = mxz;
    this.tx = tx;
    this.myx = myx;
    this.myy = myy;
    this.myz = myz;
    this.ty = ty;
    this.mzx = mzx;
    this.mzy = mzy;
    this.mzz = mzz;
    this.tz = tz;
    return this;
  };

  setMatrix(m: Matrix3x4): Matrix3x4 {
    this.mxx = m.mxx;
    this.mxy = m.mxy;
    this.mxz = m.mxz;
    this.tx = m.tx;
    this.myx = m.myx;
    this.myy = m.myy;
    this.myz = m.myz;
    this.ty = m.ty;
    this.mzx = m.mzx;
    this.mzy = m.mzy;
    this.mzz = m.mzz;
    this.tz = m.tz;
    return this;
  };

  setToMatrix4x4(m: any): void {
    m.set(
      this.mxx, this.mxy, this.mxz, this.tx,
      this.myx, this.myy, this.myz, this.ty,
      this.mzx, this.mzy, this.mzz, this.tz,
      0, 0, 0, 1
    );
  };

  toArray(): Matrix3x4Data {
    return [
      [this.mxx, this.mxy, this.mxz, this.tx],
      [this.myx, this.myy, this.myz, this.ty],
      [this.mzx, this.mzy, this.mzz, this.tz]
    ];
  };

  toFlatArray(): Matrix3x4FlatData {
    return [
      this.mxx, this.mxy, this.mxz, this.tx,
      this.myx, this.myy, this.myz, this.ty,
      this.mzx, this.mzy, this.mzz, this.tz
    ];
  };

  invert(): Matrix3x4 {
    return this.__invert(new Matrix3x4());
  };

  _invert(): Matrix3x4 {
    return this.__invert(this);
  };

  __invert(out: Matrix3x4): Matrix3x4 {

    var det =
      this.mxx * (this.myy * this.mzz - this.mzy * this.myz) +
      this.mxy * (this.myz * this.mzx - this.mzz * this.myx) +
      this.mxz * (this.myx * this.mzy - this.mzx * this.myy);

    if (det == 0.0) {
      return null;
    }

    var cxx = this.myy * this.mzz - this.myz * this.mzy;
    var cyx = -this.myx * this.mzz + this.myz * this.mzx;
    var czx = this.myx * this.mzy - this.myy * this.mzx;
    var cxt = -this.mxy * (this.myz * this.tz - this.mzz * this.ty)
      - this.mxz * (this.ty * this.mzy - this.tz * this.myy)
      - this.tx * (this.myy * this.mzz - this.mzy * this.myz);
    var cxy = -this.mxy * this.mzz + this.mxz * this.mzy;
    var cyy = this.mxx * this.mzz - this.mxz * this.mzx;
    var czy = -this.mxx * this.mzy + this.mxy * this.mzx;
    var cyt = this.mxx * (this.myz * this.tz - this.mzz * this.ty)
      + this.mxz * (this.ty * this.mzx - this.tz * this.myx)
      + this.tx * (this.myx * this.mzz - this.mzx * this.myz);
    var cxz = this.mxy * this.myz - this.mxz * this.myy;
    var cyz = -this.mxx * this.myz + this.mxz * this.myx;
    var czz = this.mxx * this.myy - this.mxy * this.myx;
    var czt = -this.mxx * (this.myy * this.tz - this.mzy * this.ty)
      - this.mxy * (this.ty * this.mzx - this.tz * this.myx)
      - this.tx * (this.myx * this.mzy - this.mzx * this.myy);

    out.mxx = cxx / det;
    out.mxy = cxy / det;
    out.mxz = cxz / det;
    out.tx = cxt / det;
    out.myx = cyx / det;
    out.myy = cyy / det;
    out.myz = cyz / det;
    out.ty = cyt / det;
    out.mzx = czx / det;
    out.mzy = czy / det;
    out.mzz = czz / det;
    out.tz = czt / det;
    return out;
  };

  combine(transform: Matrix3x4, out?: Matrix3x4): Matrix3x4 {
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

    var m = out || new Matrix3x4();
    m.mxx = (this.mxx * txx + this.mxy * tyx + this.mxz * tzx);
    m.mxy = (this.mxx * txy + this.mxy * tyy + this.mxz * tzy);
    m.mxz = (this.mxx * txz + this.mxy * tyz + this.mxz * tzz);
    m.tx = (this.mxx * ttx + this.mxy * tty + this.mxz * ttz + this.tx);
    m.myx = (this.myx * txx + this.myy * tyx + this.myz * tzx);
    m.myy = (this.myx * txy + this.myy * tyy + this.myz * tzy);
    m.myz = (this.myx * txz + this.myy * tyz + this.myz * tzz);
    m.ty = (this.myx * ttx + this.myy * tty + this.myz * ttz + this.ty);
    m.mzx = (this.mzx * txx + this.mzy * tyx + this.mzz * tzx);
    m.mzy = (this.mzx * txy + this.mzy * tyy + this.mzz * tzy);
    m.mzz = (this.mzx * txz + this.mzy * tyz + this.mzz * tzz);
    m.tz = (this.mzx * ttx + this.mzy * tty + this.mzz * ttz + this.tz);

    return m;
  };

  combine3x3(transform: Matrix3x4, out?: Matrix3x4): Matrix3x4 {
    var txx = transform.mxx;
    var txy = transform.mxy;
    var txz = transform.mxz;

    var tyx = transform.myx;
    var tyy = transform.myy;
    var tyz = transform.myz;

    var tzx = transform.mzx;
    var tzy = transform.mzy;
    var tzz = transform.mzz;


    var m = out || new Matrix3x4();
    m.mxx = (this.mxx * txx + this.mxy * tyx + this.mxz * tzx);
    m.mxy = (this.mxx * txy + this.mxy * tyy + this.mxz * tzy);
    m.mxz = (this.mxx * txz + this.mxy * tyz + this.mxz * tzz);

    m.myx = (this.myx * txx + this.myy * tyx + this.myz * tzx);
    m.myy = (this.myx * txy + this.myy * tyy + this.myz * tzy);
    m.myz = (this.myx * txz + this.myy * tyz + this.myz * tzz);

    m.mzx = (this.mzx * txx + this.mzy * tyx + this.mzz * tzx);
    m.mzy = (this.mzx * txy + this.mzy * tyy + this.mzz * tzy);
    m.mzz = (this.mzx * txz + this.mzy * tyz + this.mzz * tzz);


    return m;
  };

  __applyNoTranslation(vector: Vector, out: Vector): Vector {
    let x = vector.x;
    let y = vector.y;
    let z = vector.z;
    out.x = this.mxx * x + this.mxy * y + this.mxz * z;
    out.y = this.myx * x + this.myy * y + this.myz * z;
    out.z = this.mzx * x + this.mzy * y + this.mzz * z;
    return out;
  };

  _applyNoTranslation(vector: Vector): Vector {
    return this.__applyNoTranslation(vector, vector);
  };

  applyNoTranslation = vector => this.__applyNoTranslation(vector, new Vector());

  _apply(vector: Vector): Vector {
    return this.__apply(vector, vector);
  };

  __apply(vector: Vector, out: Vector): Vector {
    let x = vector.x;
    let y = vector.y;
    let z = vector.z;
    out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
    out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
    out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;
    return out;
  };

  apply3(data: Vec3): Vec3 {
    return this.__apply3(data, [0, 0, 0])
  };

  _apply3(data: Vec3): Vec3 {
    return this.__apply3(data, data);
  };

  __apply3([x, y, z]: Vec3, out: Vec3): Vec3 {
    out[0] = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
    out[1] = this.myx * x + this.myy * y + this.myz * z + this.ty;
    out[2] = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;
    return out;
  };

  rotateWithSphericalAxis(axisAzimuth: number, axisInclination: number, angle: number, pivot: Vector) {

    const axis = new Vector(
      Math.sin(axisAzimuth) * Math.cos(axisInclination),
      Math.sin(axisAzimuth) * Math.sin(axisInclination),
      Math.cos(axisAzimuth)
    );

    return Matrix3x4.rotateMatrix(angle, axis, pivot, this);
  };

  rotate(angle: number, axis: Vector, pivot: Vector) {
    return Matrix3x4.rotateMatrix(angle, axis, pivot, this);
  };

  static rotateMatrix(angle: number, axis: Vector, pivot: Vector, matrix?: Matrix3x4): Matrix3x4 {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    return Matrix3x4.rotationMatrix(cos, sin, axis, pivot, matrix);
  }

  static rotationFromVectorToVector(from: Vector, to: Vector, pivot: Vector, matrix?: Matrix3x4): Matrix3x4 {

    const axis = from.cross(to);

    const cos = from.dot(to);
    const sin = axis.length();

    return Matrix3x4.rotationMatrix(cos, sin, axis, pivot, matrix);

  }

  static rotationMatrix(cos: number, sin: number, axis: Vector, pivot: Vector, matrix?: Matrix3x4): Matrix3x4 {
    var axisX, axisY, axisZ;
    var m = matrix || new Matrix3x4();

    if (axis === AXIS.X || axis === AXIS.Y || axis === AXIS.Z) {
      axisX = axis.x;
      axisY = axis.y;
      axisZ = axis.z;
    } else {
      // normalize
      var mag = axis.length();

      if (mag == 0.0) {
        return m;
      } else {
        axisX = axis.x / mag;
        axisY = axis.y / mag;
        axisZ = axis.z / mag;
      }
    }

    var px = pivot.x;
    var py = pivot.y;
    var pz = pivot.z;

    m.mxx = cos + axisX * axisX * (1 - cos);
    m.mxy = axisX * axisY * (1 - cos) - axisZ * sin;
    m.mxz = axisX * axisZ * (1 - cos) + axisY * sin;

    m.tx = px * (1 - m.mxx) - py * m.mxy - pz * m.mxz;

    m.myx = axisY * axisX * (1 - cos) + axisZ * sin;
    m.myy = cos + axisY * axisY * (1 - cos);
    m.myz = axisY * axisZ * (1 - cos) - axisX * sin;
    m.ty = py * (1 - m.myy) - px * m.myx - pz * m.myz;

    m.mzx = axisZ * axisX * (1 - cos) - axisY * sin;
    m.mzy = axisZ * axisY * (1 - cos) + axisX * sin;
    m.mzz = cos + axisZ * axisZ * (1 - cos);
    m.tz = pz * (1 - m.mzz) - px * m.mzx - py * m.mzy;
    return m;
  };

  apply = vector => this.__apply(vector, new Vector());

  setTranslation(tx, ty, tz) {
    this.tx = tx;
    this.ty = ty;
    this.tz = tz;
    return this;
  }

}

export const IDENTITY_MATRIX = Object.freeze(new Matrix3x4());