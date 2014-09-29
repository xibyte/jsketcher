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
  
  public void set(double value) {
    if (locked) {
      return;
    }
    this.value = value;
  }

  public boolean isLocked() {
    return locked;
  }

  public void setLocked(boolean locked) {
    this.locked = locked;
  }
}
