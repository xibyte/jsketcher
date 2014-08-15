package cad.gl;

import cad.math.Vector;

public class BBox {
  private double minX;
  private double maxX;
  private double minY;
  private double maxY;
  private double minZ;
  private double maxZ;

  /**
   * Create an axis aligned bounding box object, with an empty bounds
   * where maxX < minX, maxY < minY and maxZ < minZ.
   */
  public BBox() {
    minX = minY = minZ = 0.0f;
    maxX = maxY = maxZ = -1.0f;
  }

  public BBox copy() {
    return new BBox(minX, minY, minZ, maxX, maxY, maxZ);
  }

  /**
   * Creates an axis aligned bounding box based on the minX, minY, minZ, maxX, maxY,
   * and maxZ values specified.
   */
  public BBox(double minX, double minY, double minZ, double maxX, double maxY, double maxZ) {
    setBounds(minX, minY, minZ, maxX, maxY, maxZ);
  }

  /**
   * Creates an axis aligned bounding box as a copy of the specified
   * BoxBounds object.
   */
  public BBox(BBox other) {
    setBounds(other);
  }


  public boolean is2D() {
    return false;
  }

  /**
   * Convenience function for getting the width of this bounds.
   * The dimension along the X-Axis.
   */
  public double getWidth() {
    return maxX - minX;
  }

  /**
   * Convenience function for getting the height of this bounds.
   * The dimension along the Y-Axis.
   */
  public double getHeight() {
    return maxY - minY;
  }

  /**
   * Convenience function for getting the depth of this bounds.
   * The dimension along the Z-Axis.
   */
  public double getDepth() {
    return maxZ - minZ;
  }

  public double getMinX() {
    return minX;
  }

  public void setMinX(double minX) {
    this.minX = minX;
  }

  public double getMinY() {
    return minY;
  }

  public void setMinY(double minY) {
    this.minY = minY;
  }

  public double getMinZ() {
    return minZ;
  }

  public void setMinZ(double minZ) {
    this.minZ = minZ;
  }

  public double getMaxX() {
    return maxX;
  }

  public void setMaxX(double maxX) {
    this.maxX = maxX;
  }

  public double getMaxY() {
    return maxY;
  }

  public void setMaxY(double maxY) {
    this.maxY = maxY;
  }

  public double getMaxZ() {
    return maxZ;
  }

  public void setMaxZ(double maxZ) {
    this.maxZ = maxZ;
  }

  public Vector getMin(Vector min) {
    if (min == null) {
      min = new Vector();
    }
    min.x = minX;
    min.y = minY;
    min.z = minZ;
    return min;

  }

  public Vector getMax(Vector max) {
    if (max == null) {
      max = new Vector();
    }
    max.x = maxX;
    max.y = maxY;
    max.z = maxZ;
    return max;

  }

  public BBox deriveWithUnion(BBox other) {
    unionWith(other);
    return this;
  }

  public BBox deriveWithNewBounds(BBox other) {
    if (other.isEmpty()) {
      return makeEmpty();
    }
    minX = other.getMinX();
    minY = other.getMinY();
    minZ = other.getMinZ();
    maxX = other.getMaxX();
    maxY = other.getMaxY();
    maxZ = other.getMaxZ();
    return this;
  }

  public BBox deriveWithNewBounds(double minX, double minY, double minZ,
                                       double maxX, double maxY, double maxZ) {
    if ((maxX < minX) || (maxY < minY) || (maxZ < minZ)) {
      return makeEmpty();
    }
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxY = maxY;
    this.maxZ = maxZ;
    return this;
  }

  public BBox deriveWithNewBoundsAndSort(double minX, double minY, double minZ,
                                              double maxX, double maxY, double maxZ) {
    setBoundsAndSort(minX, minY, minZ, maxX, maxY, maxZ);
    return this;
  }

  /**
   * Set the bounds to match that of the BoxBounds object specified. The
   * specified bounds object must not be null.
   */
  public final void setBounds(BBox other) {
    minX = other.getMinX();
    minY = other.getMinY();
    minZ = other.getMinZ();
    maxX = other.getMaxX();
    maxY = other.getMaxY();
    maxZ = other.getMaxZ();
  }

  /**
   * Set the bounds to the given values.
   */
  public final void setBounds(double minX, double minY, double minZ,
                              double maxX, double maxY, double maxZ) {
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxY = maxY;
    this.maxZ = maxZ;
  }

  public void setBoundsAndSort(double minX, double minY, double minZ,
                               double maxX, double maxY, double maxZ) {
    setBounds(minX, minY, minZ, maxX, maxY, maxZ);
    sortMinMax();
  }

  public void setBoundsAndSort(Vector p1, Vector p2) {
    setBoundsAndSort(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }

  public void unionWith(BBox other) {
    // Short circuit union if either bounds is empty.
    if (other.isEmpty()) {
      return;
    }
    if (this.isEmpty()) {
      setBounds(other);
      return;
    }

    minX = Math.min(minX, other.getMinX());
    minY = Math.min(minY, other.getMinY());
    minZ = Math.min(minZ, other.getMinZ());
    maxX = Math.max(maxX, other.getMaxX());
    maxY = Math.max(maxY, other.getMaxY());
    maxZ = Math.max(maxZ, other.getMaxZ());
  }


  public void unionWith(double minX, double minY, double minZ,
                        double maxX, double maxY, double maxZ) {
    // Short circuit union if either bounds is empty.
    if ((maxX < minX) || (maxY < minY) || (maxZ < minZ)) {
      return;
    }
    if (this.isEmpty()) {
      setBounds(minX, minY, minZ, maxX, maxY, maxZ);
      return;
    }

    this.minX = Math.min(this.minX, minX);
    this.minY = Math.min(this.minY, minY);
    this.minZ = Math.min(this.minZ, minZ);
    this.maxX = Math.max(this.maxX, maxX);
    this.maxY = Math.max(this.maxY, maxY);
    this.maxZ = Math.max(this.maxZ, maxZ);
  }

  public void add(double x, double y, double z) {
    unionWith(x, y, z, x, y, z);
  }

  public void add(Vector p) {
    add(p.x, p.y, p.z);
  }

  public void intersectWith(BBox other) {
    // Short circuit intersect if either bounds is empty.
    if (this.isEmpty()) {
      return;
    }
    if (other.isEmpty()) {
      makeEmpty();
      return;
    }

    minX = Math.max(minX, other.getMinX());
    minY = Math.max(minY, other.getMinY());
    minZ = Math.max(minZ, other.getMinZ());
    maxX = Math.min(maxX, other.getMaxX());
    maxY = Math.min(maxY, other.getMaxY());
    maxZ = Math.min(maxZ, other.getMaxZ());
  }

  public void intersectWith(double minX, double minY, double minZ,
                            double maxX, double maxY, double maxZ) {
    // Short circuit intersect if either bounds is empty.
    if (this.isEmpty()) {
      return;
    }
    if ((maxX < minX) || (maxY < minY) || (maxZ < minZ)) {
      makeEmpty();
      return;
    }

    this.minX = Math.max(this.minX, minX);
    this.minY = Math.max(this.minY, minY);
    this.minZ = Math.max(this.minZ, minZ);
    this.maxX = Math.min(this.maxX, maxX);
    this.maxY = Math.min(this.maxY, maxY);
    this.maxZ = Math.min(this.maxZ, maxZ);
  }

  public boolean contains(Vector p) {
    if ((p == null) || isEmpty()) {
      return false;
    }
    return contains(p.x, p.y, p.z);
  }

  public boolean contains(double x, double y, double z) {
    if (isEmpty()) {
      return false;
    }
    return (x >= minX && x <= maxX && y >= minY && y <= maxY
            && z >= minZ && z <= maxZ);
  }

  public boolean contains(double x, double y, double z,
                          double width, double height, double depth) {
    if (isEmpty()) {
      return false;
    }
    return contains(x, y, z) && contains(x + width, y + height, z + depth);
  }

  public boolean intersects(double x, double y, double z,
                            double width, double height, double depth) {
    if (isEmpty()) {
      return false;
    }
    return (x + width >= minX &&
            y + height >= minY &&
            z + depth >= minZ &&
            x <= maxX &&
            y <= maxY &&
            z <= maxZ);
  }

  public boolean intersects(BBox other) {
    if ((other == null) || other.isEmpty() || isEmpty()) {
      return false;
    }
    return (other.getMaxX() >= minX &&
            other.getMaxY() >= minY &&
            other.getMaxZ() >= minZ &&
            other.getMinX() <= maxX &&
            other.getMinY() <= maxY &&
            other.getMinZ() <= maxZ);
  }

  public boolean disjoint(double x, double y, double width, double height) {
    return disjoint(x, y, 0f, width, height, 0f);
  }

  public boolean disjoint(double x, double y, double z,
                          double width, double height, double depth) {
    if (isEmpty()) {
      return true;
    }
    return (x + width < minX ||
            y + height < minY ||
            z + depth < minZ ||
            x > maxX ||
            y > maxY ||
            z > maxZ);
  }

  public boolean isEmpty() {
    return maxX < minX || maxY < minY || maxZ < minZ;
  }

  /**
   * Adjusts the edges of this BoxBounds "outward" toward integral boundaries,
   * such that the rounded bounding box will always full enclose the original
   * bounding box.
   */
  public void roundOut() {
    minX = Math.floor(minX);
    minY = Math.floor(minY);
    minZ = Math.floor(minZ);
    maxX = Math.ceil(maxX);
    maxY = Math.ceil(maxY);
    maxZ = Math.ceil(maxZ);
  }

  public void grow(double h, double v, double d) {
    minX -= h;
    maxX += h;
    minY -= v;
    maxY += v;
    minZ -= d;
    maxZ += d;
  }

  public BBox deriveWithPadding(double h, double v, double d) {
    grow(h, v, d);
    return this;
  }

  // for convenience, this function returns a reference to itself, so we can
  // change from using "bounds.makeEmpty(); return bounds;" to just
  // "return bounds.makeEmpty()"
  public BBox makeEmpty() {
    minX = minY = minZ = 0.0f;
    maxX = maxY = maxZ = -1.0f;
    return this;
  }

  protected void sortMinMax() {
    if (minX > maxX) {
      double tmp = maxX;
      maxX = minX;
      minX = tmp;
    }
    if (minY > maxY) {
      double tmp = maxY;
      maxY = minY;
      minY = tmp;
    }
    if (minZ > maxZ) {
      double tmp = maxZ;
      maxZ = minZ;
      minZ = tmp;
    }
  }

  public void translate(double x, double y, double z) {
    setMinX(getMinX() + x);
    setMinY(getMinY() + y);
    setMaxX(getMaxX() + x);
    setMaxY(getMaxY() + y);
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == null) {
      return false;
    }
    if (getClass() != obj.getClass()) {
      return false;
    }

    final BBox other = (BBox) obj;
    if (minX != other.getMinX()) {
      return false;
    }
    if (minY != other.getMinY()) {
      return false;
    }
    if (minZ != other.getMinZ()) {
      return false;
    }
    if (maxX != other.getMaxX()) {
      return false;
    }
    if (maxY != other.getMaxY()) {
      return false;
    }
    if (maxZ != other.getMaxZ()) {
      return false;
    }
    return true;
  }

  @Override
  public int hashCode() {
    long hash = 7;
    hash = 79 * hash + Double.doubleToLongBits(minX);
    hash = 79 * hash + Double.doubleToLongBits(minY);
    hash = 79 * hash + Double.doubleToLongBits(minZ);
    hash = 79 * hash + Double.doubleToLongBits(maxX);
    hash = 79 * hash + Double.doubleToLongBits(maxY);
    hash = 79 * hash + Double.doubleToLongBits(maxZ);

    return (int) hash;
  }

  @Override
  public String toString() {
    return "BBox { minX:" + minX + ", minY:" + minY + ", minZ:" + minZ + ", maxX:" + maxX + ", maxY:" + maxY + ", maxZ:" + maxZ + "}";
  }
}
