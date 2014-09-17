package cad.math;

/**
 * Created by verastov on 7/8/14.
 */
public class Matrix {

  public double
    mxx, mxy, mxz, tx,
    myx, myy, myz, ty,
    mzx, mzy, mzz, tz;

  public Matrix() {
    mxx = 1; mxy = 0; mxz = 0; tx = 0;
    myx = 0; myy = 1; myz = 0; ty = 0;
    mzx = 0; mzy = 0; mzz = 1; tz = 0;
  }

  public Matrix(Vector[] basis) {
    Vector[] b = basis; 
    mxx = b[0].x; mxy = b[1].x; mxz = b[2].x; tx = 0;
    myx = b[0].y; myy = b[1].y; myz = b[2].y; ty = 0;
    mzx = b[0].z; mzy = b[1].z; mzz = b[2].z; tz = 0;
  }

  public Matrix(
      double mxx, double mxy, double mxz,
      double myx, double myy, double myz,
      double mzx, double mzy, double mzz
  ) {
    this.mxx = mxx; this.mxy = mxy; this.mxz = mxz;
    this.myx = myx; this.myy = myy; this.myz = myz;
    this.mzx = mzx; this.mzy = mzy; this.mzz = mzz;
  }

  public Matrix(
          double mxx, double mxy, double mxz, double tx,
          double myx, double myy, double myz, double ty,
          double mzx, double mzy, double mzz, double tz
  ) {
    this.mxx = mxx; this.mxy = mxy; this.mxz = mxz; this.tx = tx;
    this.myx = myx; this.myy = myy; this.myz = myz; this.ty = ty;
    this.mzx = mzx; this.mzy = mzy; this.mzz = mzz; this.tz = tz;
  }

  public void set(Matrix m) {
    this.mxx = m.mxx; this.mxy = m.mxy; this.mxz = m.mxz; this.tx = m.tx;
    this.myx = m.myx; this.myy = m.myy; this.myz = m.myz; this.ty = m.ty;
    this.mzx = m.mzx; this.mzy = m.mzy; this.mzz = m.mzz; this.tz = m.tz;
  }

  public Matrix invert() {

    final double det =
            mxx * (myy * mzz - mzy * myz) +
                    mxy * (myz * mzx - mzz * myx) +
                    mxz * (myx * mzy - mzx * myy);

    if (det == 0.0) {
      return null;
    }

    final double cxx =   myy * mzz - myz * mzy;
    final double cyx = - myx * mzz + myz * mzx;
    final double czx =   myx * mzy - myy * mzx;
    final double cxt = - mxy * (myz * tz - mzz  * ty)
            - mxz * (ty  * mzy - tz  * myy)
            - tx  * (myy * mzz - mzy * myz);
    final double cxy = - mxy * mzz + mxz * mzy;
    final double cyy =   mxx * mzz - mxz * mzx;
    final double czy = - mxx * mzy + mxy * mzx;
    final double cyt =   mxx * (myz * tz  - mzz * ty)
            + mxz * (ty  * mzx - tz  * myx)
            + tx  * (myx * mzz - mzx * myz);
    final double cxz =   mxy * myz - mxz * myy;
    final double cyz = - mxx * myz + mxz * myx;
    final double czz =   mxx * myy - mxy * myx;
    final double czt = - mxx * (myy * tz - mzy  * ty)
            - mxy * (ty  * mzx - tz  * myx)
            - tx  * (myx * mzy - mzx * myy);

    Matrix result = new Matrix();
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
  }

  public Matrix combine(Matrix transform) {
    final double txx = transform.mxx;
    final double txy = transform.mxy;
    final double txz = transform.mxz;
    final double ttx = transform.tx;
    final double tyx = transform.myx;
    final double tyy = transform.myy;
    final double tyz = transform.myz;
    final double tty = transform.ty;
    final double tzx = transform.mzx;
    final double tzy = transform.mzy;
    final double tzz = transform.mzz;
    final double ttz = transform.tz;

    Matrix m = new Matrix();
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
  }

  @Override
  public String toString() {
    String str = "";
    str += String.format("%.4f, %.4f, %.4f, %.4f\n", mxx, mxy, mxz, tx);
    str += String.format("%.4f, %.4f, %.4f, %.4f\n", myx, myy, myz, ty);
    str += String.format("%.4f, %.4f, %.4f, %.4f"  , mzx, mzy, mzz, tz);
    return str;
  }

  
}
