package cad.gcs;

public class Param {

  public double value;
  public boolean locked;
  
  public Param(double value) {
    this.value = value;
  }

  public double get() {
    return value;
  }
  
  public double set(double value) {
    return this.value = value;
  }

  public boolean isLocked() {
    return locked;
  }

  public void setLocked(boolean locked) {
    this.locked = locked;
  }
}
