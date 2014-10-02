package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;

/**
 * Created by verastov
 */
public class P2PDistance extends AbstractConstraint {

  public static final int p1x = 0;
  public static final int p1y = 1;
  public static final int p2x = 2;
  public static final int p2y = 3;
  private double distance;

  public P2PDistance(Param p1x, Param p1y, Param p2x, Param p2y, double distance) {
    super(p1x, p1y, p2x, p2y);
    this.distance = distance;
  }

  @Override
  public double error() {
    double dx = get(p1x) - get(p2x);
    double dy = get(p1y) - get(p2y);
    double d = Math.sqrt(dx * dx + dy * dy);
    return (d - distance);
  }

  @Override
  public void gradient(double[] out) {

    double dx = get(p1x) - get(p2x);
    double dy = get(p1y) - get(p2y);
    double d = Math.sqrt(dx * dx + dy * dy);
    out[p1x] = dx / d;
    out[p1y] = dy / d;
    out[p2x] = -dx / d;
    out[p2y] = -dy / d;
  }
}
