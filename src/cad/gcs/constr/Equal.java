package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;

public class Equal implements Constraint, Reconcilable {

  private final Param[] params;

  public Equal(Param p1, Param p2) {
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

  @Override
  public void reconcile() {
    double x1 = params[0].get();
    double x2 = params[1].get();
    double diff = (x1 - x2) / 2;
    params[0].set(x1 - diff);
    params[1].set(x2 + diff);
  }
}
