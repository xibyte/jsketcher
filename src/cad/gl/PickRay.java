
package cad.gl;

import cad.math.Vector;

/**
 * A ray used for picking.
 */
public class PickRay {
  private Vector origin = new Vector();
  private Vector direction = new Vector();
  private double nearClip = 0.0;
  private double farClip = Double.POSITIVE_INFINITY;

  //    static final double EPS = 1.0e-13;
  static final double EPS = 1.0e-5f;

  public PickRay() {
  }

  public PickRay(Vector origin, Vector direction, double nearClip, double farClip) {
    set(origin, direction, nearClip, farClip);
  }

  public PickRay(double x, double y, double z, double nearClip, double farClip) {
    set(x, y, z, nearClip, farClip);
  }


  public final void set(Vector origin, Vector direction, double nearClip, double farClip) {
    setOrigin(origin);
    setDirection(direction);
    this.nearClip = nearClip;
    this.farClip = farClip;
  }

  public final void set(double x, double y, double z, double nearClip, double farClip) {
    setOrigin(x, y, -z);
    setDirection(0, 0, z);
    this.nearClip = nearClip;
    this.farClip = farClip;
  }


  public void setPickRay(PickRay other) {
    setOrigin(other.origin);
    setDirection(other.direction);
    nearClip = other.nearClip;
    farClip = other.farClip;
  }

  public PickRay copy() {
    return new PickRay(origin, direction, nearClip, farClip);
  }

  /**
   * Sets the origin of the pick ray in world coordinates.
   *
   * @param origin the origin (in world coordinates).
   */
  public void setOrigin(Vector origin) {
    this.origin.set(origin);
  }

  /**
   * Sets the origin of the pick ray in world coordinates.
   *
   * @param x the origin X coordinate
   * @param y the origin Y coordinate
   * @param z the origin Z coordinate
   */
  public void setOrigin(double x, double y, double z) {
    this.origin.set(x, y, z);
  }

  public Vector getOrigin(Vector rv) {
    if (rv == null) {
      rv = new Vector();
    }
    rv.set(origin);
    return rv;
  }

  public Vector getOriginNoClone() {
    return origin;
  }

  /**
   * Sets the direction vector of the pick ray. This vector need not
   * be normalized.
   *
   * @param direction the direction vector
   */
  public void setDirection(Vector direction) {
    this.direction.set(direction);
  }

  /**
   * Sets the direction of the pick ray. The vector need not be normalized.
   *
   * @param x the direction X magnitude
   * @param y the direction Y magnitude
   * @param z the direction Z magnitude
   */
  public void setDirection(double x, double y, double z) {
    this.direction.set(x, y, z);
  }

  public Vector getDirection(Vector rv) {
    if (rv == null) {
      rv = new Vector();
    }
    rv.set(direction);
    return rv;
  }

  public Vector getDirectionNoClone() {
    return direction;
  }

  public double getNearClip() {
    return nearClip;
  }

  public double getFarClip() {
    return farClip;
  }

  public double distance(Vector iPnt) {
    double x = iPnt.x - origin.x;
    double y = iPnt.y - origin.y;
    double z = iPnt.z - origin.z;
    return Math.sqrt(x * x + y * y + z * z);
  }


  private static final double EPSILON_ABSOLUTE = 1.0e-5;

  static boolean almostZero(double a) {
    return ((a < EPSILON_ABSOLUTE) && (a > -EPSILON_ABSOLUTE));
  }

  private static boolean isNonZero(double v) {
    return ((v > EPS) || (v < -EPS));

  }

  @Override
  public String toString() {
    return "origin: " + origin + "  direction: " + direction;
  }
}
