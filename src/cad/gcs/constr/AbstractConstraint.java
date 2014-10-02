package cad.gcs.constr;

import cad.gcs.Constraint;
import cad.gcs.Param;

/**
 * Created by verastov
 */
public abstract class AbstractConstraint implements Constraint {
  
  
  protected final Param[] params;

  protected AbstractConstraint(Param... params) {
    this.params = params;
  }

  @Override
  public int pSize() {
    return params.length;
  }

  @Override
  public Param[] getParams() {
    return params;
  }
  
  public double get(int idx) {
    return params[idx].get();
  }
}
