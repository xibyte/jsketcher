package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;

public class Equals implements Constraint {

  private final Param[] params;

  public Equals(Param p1, Param p2) {
    this.params = new Param[]{p1, p2};
  }

  @Override
  public double error() {
    return params[0].get() - params[1].get();
  }

  @Override
  public Param[] getParams() {
    return params;
  }

  @Override
  public void gradient(double[] out) {
    out[0] = 1;
    out[1] = -1;
  }

  @Override
  public int pSize() {
    return params.length;
  }
}
