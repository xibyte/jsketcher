package cad.gcs.constr;

import cad.math.Vector;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Perpendicular2 implements Constraint2 {

  public final Vector a1;
  public final Vector a2;
  public final Vector b1;
  public final Vector b2;
  private double target;

  public Perpendicular2(Vector a1, Vector a2, Vector b1, Vector b2) {
    this.a1 = a1;
    this.a2 = a2;
    this.b1 = b1;
    this.b2 = b2;
    this.target = target;
  }

  @Override
  public double error() {
    return da().dot(db());
  }

  @Override
  public List<Vector> params() {
    return Arrays.asList(a1, a2, b1, b2);
  }

  @Override
  public List<Vector> gradient() {
    List<Vector> grad = new ArrayList<>(4);
//    Vector da = da();
//    Vector db = db();
//    double k = da().dot(db()) > 0 ? -1 : 1;
////    double k = 1;
//    grad.add(db.multi(- k));
//    grad.add(db.multi(  k));
//    grad.add(da.multi(- k));
//    grad.add(da.multi(  k));
//    return grad;
    
    double k =  (da().dot(db()) * 2);

    Vector da = da();
    Vector db = db();
    grad.add(a1.multi(db.x, db.y, db.z).multi(-1));
    grad.add(a2.multi(db.x, db.y, db.z));
    
    grad.add(b1.multi(da.x, da.y, da.z).multi(-1));
    grad.add(b2.multi(da.x, da.y, da.z));
    
    return grad;
    
  }

  private Vector db() {
    return b2.minus(b1);
  }

  private Vector da() {
    return a2.minus(a1);
  }

  @Override
  public Object debug() {
    return Math.acos(error() / (da().length() * db().length()) ) / Math.PI * 180;
  }
}
