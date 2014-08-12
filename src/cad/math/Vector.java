package cad.math;

public class Vector {

  public double x;
  public double y;
  public double z;

  public Vector() {
  }

  public Vector(double x, double y, double z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public Vector(Vector vector) {
    this(vector.x, vector.y, vector.z);
  }

  public Vector(double x, double y) {
    this(x, y, 0);
  }

  public Vector(double[] data) {
    if (data.length > 0) {
      x = data[0];
      if (data.length > 1) {
        y = data[1];
        if (data.length > 2) {
          z = data[2];
        }
      }
    }
  }

  public Vector scale(double factor) {
    return scale(factor, factor, factor);
  }

  public Vector scale(double dx, double dy, double dz) {
    return new Vector(x * dx, y * dy, z * dz);
  }

  public double dot(Vector vector) {
    return x * vector.x + y * vector.y + z * vector.z;
  }

  public Vector copy() {
    return new Vector(this);
  }

  public double length() {
    return Math.sqrt(x*x + y*y + z*z);
  }

  @Override
  public String toString() {
    return String.format("[%.4f, %.4f, %.4f]", x, y, z);
  }

  public Vector minus(Vector vector) {
    return new Vector(x - vector.x, y - vector.y, z - vector.z);
  }

  public Vector plus(Vector vector) {
    return new Vector(x + vector.x, y + vector.y, z + vector.z);
  }

  public Vector plus(double dx, double dy, double dz) {
    return new Vector(x + dx, y + dy, z + dz);
  }

  public Vector normalize() {
    final double mag = length();
    if (mag == 0.0) {
      return new Vector(0.0, 0.0, 0.0);
    }
    return new Vector(x / mag, y / mag, z / mag);
  }

  public Vector cross(Vector a) {
    return new Vector(
        this.y * a.z - this.z * a.y,
        this.z * a.x - this.x * a.z,
        this.x * a.y - this.y * a.x
    );
  }

  public boolean slightlyEqualTo(Vector vector) {
    return equalTo(vector, HMath.TOLERANCE);
  }

  public boolean equalTo(Vector vector, double tolerance) {
    return
        HMath.areEquals(x, vector.x, tolerance) &&
        HMath.areEquals(y, vector.y, tolerance) &&
        HMath.areEquals(z, vector.z, tolerance);
  }

  public Vector negate() {
    return scale(-1);
  }
}
