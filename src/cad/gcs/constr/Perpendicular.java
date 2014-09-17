package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;
import cad.math.Vector;

import java.util.List;

public class Perpendicular implements Constraint {

  public static final int l1p1x = 0;
  public static final int l1p1y = 1;
  public static final int l1p2x = 2;
  public static final int l1p2y = 3;
  public static final int l2p1x = 4;
  public static final int l2p1y = 5;
  public static final int l2p2x = 6;
  public static final int l2p2y = 7;
  
  private final double[] params = new double[8];

  public Perpendicular(Vector a1, Vector a2, Vector b1, Vector b2) {
    params[l1p1x] = a1.x;
    params[l1p1y] = a1.y;
    params[l1p2x] = b1.x;
    params[l1p2y] = b1.y;
    params[l2p1x] = a2.x;
    params[l2p1y] = a2.y;
    params[l2p2x] = b2.x;
    params[l2p2y] = b2.y;
  }

  public void out(Vector a1, Vector a2, Vector b1, Vector b2) {
    a1.x = params[l1p1x];
    a1.y = params[l1p1y];
    b1.x = params[l1p2x];
    b1.y = params[l1p2y];
    a2.x = params[l2p1x];
    a2.y = params[l2p1y];
    b2.x = params[l2p2x];
    b2.y = params[l2p2y];
  }

  @Override
  public double[] params() {
    return params;
  }

  @Override
  public double error() {
    double dx1 = (params[l1p1x] - params[l1p2x]);
    double dy1 = (params[l1p1y] - params[l1p2y]);
    double dx2 = (params[l2p1x] - params[l2p2x]);
    double dy2 = (params[l2p1y] - params[l2p2y]);
    //dot product shows how the lines off to be perpendicular
    double off = dx1 * dx2 + dy1 * dy2;
    return off;
  }

  @Override
  public void gradient(double[] out) {
    out[l1p1x] =  (params[l2p1x] - params[l2p2x]); // = dx2
    out[l1p2x] = -(params[l2p1x] - params[l2p2x]); // = -dx2
    out[l1p1y] =  (params[l2p1y] - params[l2p2y]); // = dy2
    out[l1p2y] = -(params[l2p1y] - params[l2p2y]); // = -dy2
    out[l2p1x] =  (params[l1p1x] - params[l1p2x]); // = dx1
    out[l2p2x] = -(params[l1p1x] - params[l1p2x]); // = -dx1
    out[l2p1y] =  (params[l1p1y] - params[l1p2y]); // = dy1
    out[l2p2y] = -(params[l1p1y] - params[l1p2y]); // = -dy1

//    for (int i = 0; i < out.length; i++) {
//      out[i] *= err;
//    }
  }

  @Override
  public void set(double[] input) {
    System.arraycopy(input, 0, params, 0, params.length);
  }

}
