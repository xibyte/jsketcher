package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;

public class EqualsTo implements Constraint {

  private final Param[] params;
  private final double value;

  public EqualsTo(Param p, double value) {
    this.value = value;
    this.params = new Param[]{p};
  }

  @Override
  public double error() {
    return params[0].get() - value;
  }

  @Override
  public Param[] getParams() {
    return params;
  }

  @Override
  public void gradient(double[] out) {
    out[0] = 1;
  }

  @Override
  public int pSize() {
    return params.length;
  }
}
