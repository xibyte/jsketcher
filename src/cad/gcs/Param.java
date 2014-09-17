package cad.gcs;

public abstract class Param {

  public final Constraint constraint;

  protected Param(Constraint constraint) {
    this.constraint = constraint;
  }

  public abstract double value();
}
