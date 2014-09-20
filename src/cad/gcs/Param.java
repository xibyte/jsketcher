package cad.gcs;

public class Param {

  public double value;

  public Param(double value) {
    this.value = value;
  }

  public double get() {
    return value;
  }
  
  public double set(double value) {
    return this.value = value;
  }
}
