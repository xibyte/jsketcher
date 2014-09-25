package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;
import cad.math.Vector;

import static java.lang.Math.abs;
import static java.lang.Math.sqrt;

public class P2LDistance implements Constraint {

  private final Param[] params = new Param[6];

  public static final int tx = 0;
  public static final int ty = 1;
  public static final int lp1x = 2;
  public static final int lp1y = 3;
  public static final int lp2x = 4;
  public static final int lp2y = 5;

  private final double distance;

  public P2LDistance(double distance, Param...params) {
    this.distance = distance;
    System.arraycopy(params, 0, this.params, 0, params.length);
  }

  public double error() {
    double x0 = p0x(), x1 = p1x(), x2 = p2x();
    double y0 = p0y(), y1 = p1y(), y2 = p2y();
    double dist = distance();
    double dx = x2 - x1;
    double dy = y2 - y1;
    double d = sqrt(dx * dx + dy * dy);
    double area = abs
            (-x0 * dy + y0 * dx + x1 * y2 - x2 * y1); // = x1y2 - x2y1 - x0y2 + x2y0 + x0y1 - x1y0 = 2*(triangle area)
    return (area / d - dist);

  }


  public double error2() {
//    //Basis
    double dx = params[lp2x].get() - params[lp1x].get();
    double dy = params[lp2y].get() - params[lp1y].get();
    Vector n = new Vector(-dy, dx).normalize();
    Vector target = new Vector(params[tx].get() - params[lp1x].get(), params[ty].get() - params[lp1y].get());
    return distance - target.dot(n);

  }

  private double distance() {
    return distance;
  }

  private double p1x() {
    return params[lp1x].get();
  }

  private double p1y() {
    return params[lp1y].get();
  }

  private double p2x() {
    return params[lp2x].get();
  }

  private double p2y() {
    return params[lp2y].get();
  }

  private double p0x() {
    return params[tx].get();
  }

  private double p0y() {
    return params[ty].get();
  }

  public void gradient1(double[] out) {
    double x1 = params[lp1x].get();
    double x3 = params[lp2x].get();
    double x2 = params[lp1y].get();
    double x4 = params[lp2y].get();
    double x5 = params[tx].get();
    double x6 = params[ty].get();

//    double dx = x3 - x1;
//    double dy = x4 - x2;
//    Vector n = new Vector(-dy, dx).normalize();
//    Vector target = new Vector(x5 - x1, x6 - x2);
//
//    double nx = (x2 - x4) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 );
//    double ny = (x4 - x2) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 );
//
//    double dot = (x5 - x1)*nx + (x6 - x2)*ny;
//    g(x1, x2, x3, x4)=sqrt( (x2 - x4)^2 + (x3 - x1)^2 );
//    f(x1, x2, x3, x4, x5, x6) = distance - (x5 - x1)*(x2 - x4) / g(x1, x2, x3, x4) + (x6 - x2) * (x4 - x2) / g(x1, x2, x3, x4);
//
//    f(x1) = distance - (x5 - x1)*(x2 - x4) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 ) + (x6 - x2) * (x4 - x2) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 );


    //MAXIMA
//    diff(distance - (x5 - x1)*(x2 - x4) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 ) + (
//    x6 - x2) * (x4 - x2) / sqrt( (x2 - x4)^2 + (x3 - x1)^2 ), x1);




//    (x3-x1)*(x4-x2)*(x6-x2) / Math.pow(())



  }

  public void gradient2(double[] out) {
    double x0 = p0x(), x1 = p1x(), x2 = p2x();
    double y0 = p0y(), y1 = p1y(), y2 = p2y();
    double dx = x2 - x1;
    double dy = y2 - y1;
    double d2 = dx * dx + dy * dy;
    double d = sqrt(d2);
    double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    out[tx]   = (y1-y2)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))
    *abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0));
    
    out[ty]   = (x2-x1)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))
    *abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0));
    
    out[lp1x] = (x2-x1)* abs(x1 * y2 - x0 * y2 - x2 * y1 + x0 * y1 + x2 * y0 - x1 * y0)/p(sq(y2-y1)+sq(x2-x1), 3/2)
            +(y2-y0)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))*Math.abs(x1 * y2 - x0 * y2 - x2 * y1 + x0 * y1 + x2 * y0 - x1 * y0));

    out[lp1y] = (y2-y1)*abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/p(sq(y2-y1)+sq(x2-x1),3/2)
     +(x0-x2)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))*
    abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0));
    
    out[lp2x] = (y0-y1)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))
                *abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0))-(x2-x1)*abs(x1*y2-x0*y2-x2*y1+x0*y1
                +x2*y0-x1*y0)/p(sq(y2-y1)+sq(x2-x1), 3/2);
    
    out[lp2y] = (x1-x0)*(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0)/(sqrt(sq(y2-y1)+sq(x2-x1))
    *abs(x1*y2-x0*y2-x2*y1+x0*y1+x2*y0-x1*y0))-(y2-y1)*abs(x1*y2-x0*y2-x2*y1+x0*y1
            +x2*y0-x1*y0)/p(sq(y2-y1)+sq(x2-x1),3/2);

//    if (area < 0) {
//      for (int i = 0; i < 6; i++) {
//        out[i] *= -1;
//      }
//    }
  }

  private double p(double v, int i) {
    return Math.pow(v, i);
  }

  private double sq(double a) {
    return a*a;
  }

  public void gradient(double[] out) {
    double x0 = p0x(), x1 = p1x(), x2 = p2x();
    double y0 = p0y(), y1 = p1y(), y2 = p2y();
    double dx = x2 - x1;
    double dy = y2 - y1;
    double d2 = dx * dx + dy * dy;
    double d = sqrt(d2);
    double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
    out[tx]   = ((y1 - y2) / d);
    out[ty]   = ((x2 - x1) / d);
    out[lp1x] = (((y2 - y0) * d + (dx / d) * area) / d2);
    out[lp1y] = (((x0 - x2) * d + (dy / d) * area) / d2);
    out[lp2x] = (((y0 - y1) * d - (dx / d) * area) / d2);
    out[lp2y] = (((x1 - x0) * d - (dy / d) * area) / d2);

    if (area < 0) {
      for (int i = 0; i < 6; i++) {
        out[i] *= -1;
      }
    }
  }

  @Override
  public Param[] getParams() {
    return params;
  }

  @Override
  public int pSize() {
    return 6;
  }


}
