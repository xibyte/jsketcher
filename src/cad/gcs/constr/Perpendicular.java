package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;
import cad.math.Vector;

public class Perpendicular implements Constraint {

  public static final int l1p1x = 0;
  public static final int l1p1y = 1;
  public static final int l1p2x = 2;
  public static final int l1p2y = 3;
  public static final int l2p1x = 4;
  public static final int l2p1y = 5;
  public static final int l2p2x = 6;
  public static final int l2p2y = 7;

  private final Param[] params = new Param[8];

  public Perpendicular(
    Param _l1p1x,
    Param _l1p1y,
    Param _l1p2x,
    Param _l1p2y,
    Param _l2p1x,
    Param _l2p1y,
    Param _l2p2x,
    Param _l2p2y
  ) {
    params[l1p1x] = _l1p1x;
    params[l1p1y] = _l1p1y;
    params[l1p2x] = _l1p2x;
    params[l1p2y] = _l1p2y;
    params[l2p1x] = _l2p1x;
    params[l2p1y] = _l2p1y;
    params[l2p2x] = _l2p2x;
    params[l2p2y] = _l2p2y;
  }

  public void out(Vector p1, Vector p2, Vector p3, Vector p4) {
    p1.x = params[l1p1x].get();
    p1.y = params[l1p1y].get();
    p2.x = params[l1p2x].get();
    p2.y = params[l1p2y].get();
    p3.x = params[l2p1x].get();
    p3.y = params[l2p1y].get();
    p4.x = params[l2p2x].get();
    p4.y = params[l2p2y].get();
  }

  @Override
  public Param[] getParams() {
    return params;
  }

  @Override
  public double error() {
    double dx1 = (params[l1p1x].get() - params[l1p2x].get());
    double dy1 = (params[l1p1y].get() - params[l1p2y].get());
    double dx2 = (params[l2p1x].get() - params[l2p2x].get());
    double dy2 = (params[l2p1y].get() - params[l2p2y].get());
    //dot product shows how the lines off to be perpendicular
    return (dx1 * dx2 + dy1 * dy2);
  }

  //derivative of ((x-a1)*a2 + a3)^2
  public double partDerivative1(double a1, double a2, double a3, double x) {
    return 2*a2*(-a1*a2 + a2*x+a3);
  }

  //derivative of ((a1-x)*a2 + a3)^2
  public double partDerivative2(double a1, double a2, double a3, double x) {
    return -2*a2*(a1*a2 - a2*x+a3);
  }

  public void gradient(double[] out) {

    out[l1p1x] =  (params[l2p1x].get() - params[l2p2x].get()); // = dx2
    out[l1p2x] = -(params[l2p1x].get() - params[l2p2x].get()); // = -dx2
    out[l1p1y] =  (params[l2p1y].get() - params[l2p2y].get()); // = dy2
    out[l1p2y] = -(params[l2p1y].get() - params[l2p2y].get()); // = -dy2
    out[l2p1x] =  (params[l1p1x].get() - params[l1p2x].get()); // = dx1
    out[l2p2x] = -(params[l1p1x].get() - params[l1p2x].get()); // = -dx1
    out[l2p1y] =  (params[l1p1y].get() - params[l1p2y].get()); // = dy1
    out[l2p2y] = -(params[l1p1y].get() - params[l1p2y].get()); // = -dy1
    
  }
  
  public void gradient3(double[] out) {

    double x1 = params[l1p1x].get();
    double x2 = params[l1p1y].get();
    double x3 = params[l1p2x].get();
    double x4 = params[l1p2y].get();
    double x5 = params[l2p1x].get();
    double x6 = params[l2p1y].get();
    double x7 = params[l2p2x].get();
    double x8 = params[l2p2y].get();

    double c1 = x3 - x1;
    double c2 = x7 - x5;
    double c3 = x4 - x2;
    double c4 = x8 - x6;

    //f(x) = ( (x3 - x1) * (x7 - x5) + (x4 - x2) * (x8 - x6) ) ^ 2

    out[l1p1x] = partDerivative2(x3, c2, c3 * c4, x1);
    out[l1p1y] = partDerivative2(x4, c4, c1 * c2, x2);

    out[l1p2x] = partDerivative1(x1, c2, c3 * c4, x3);
    out[l1p2y] = partDerivative1(x2, c4, c1 * c2, x4);

    out[l2p1x] = partDerivative2(x7, c1, c3 * c4, x5);
    out[l2p1y] = partDerivative2(x8, c3, c1 * c2, x6);

    out[l2p2x] = partDerivative1(x5, c1, c3 * c4, x7);
    out[l2p2y] = partDerivative1(x6, c3, c1 * c2, x8);
  }

  public void gradient2(double[] out) {

    Vector p1 = new Vector(); 
    Vector p2  = new Vector(); 
    Vector p3  = new Vector(); 
    Vector p4  = new Vector();    
    
    out(p1, p2, p3, p4);
    
    Vector da = p2.minus(p1);
    Vector db = p4.minus(p3);
    
    double k =  (da.dot(db) * 2);
    
    Vector g1 = p1.multi(db.x, db.y, db.z).multi(-k);
    Vector g2 = p2.multi(db.x, db.y, db.z).multi(k);
    Vector g3 = p3.multi(da.x, da.y, da.z).multi(-k);
    Vector g4 = p4.multi(da.x, da.y, da.z).multi(k);
    
    out[l1p1x] =  g1.x; // = dx2
    out[l1p1y] =  g1.y; // = dx2
    
    out[l1p2x] = g2.x;
    out[l1p2y] = g2.y;
    
    out[l2p1x] =  g3.x;
    out[l2p1y] =  g3.y;
    
    out[l2p2x] = g4.x;
    out[l2p2y] = g4.y;
  }


  public double angle() {
    double dx1 = (params[l1p2x].get() - params[l1p1x].get());
    double dy1 = (params[l1p2y].get() - params[l1p1y].get());
    double dx2 = (params[l2p2x].get() - params[l2p1x].get());
    double dy2 = (params[l2p2y].get() - params[l2p1y].get());
    //dot product shows how the lines off to be perpendicular
    double xl = Math.sqrt(dx1 * dx1 + dx2 * dx2);
    double yl = Math.sqrt(dy1*dy1 + dy2*dy2);
    double off = (dx1 * dx2 + dy1 * dy2) / (xl*yl);

    return Math.acos(off) / Math.PI * 180;
  }

  private void step(int px, int py, double gx, double gy, double alpha) {
    Vector dd = new Vector(gx, gy).normalize().multi(alpha);
    Vector n = new Vector(params[px].get(), params[py].get()).plus(dd);
    params[px].set(n.x);
    params[py].set(n.y);
  }

  @Override
  public int pSize() {
    return 8;
  }

  public void set(double[] input) {
    params[l1p1x].set(input[l1p1x]);
    params[l1p1y].set(input[l1p1y]);
    params[l1p2x].set(input[l1p2x]);
    params[l1p2y].set(input[l1p2y]);
    params[l2p1x].set(input[l2p1x]);
    params[l2p1y].set(input[l2p1y]);
    params[l2p2x].set(input[l2p2x]);
    params[l2p2y].set(input[l2p2y]);
  }

}
