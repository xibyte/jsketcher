package cad.gcs.constr;

import cad.math.Vector;

import java.util.Collections;
import java.util.List;

/**
 * Created by verastov
 */
public class XY implements Constraint2 {

  private final Vector point;
  private final Vector lock;

  public XY(Vector point, Vector lock) {
    this.point = point;
    this.lock = lock;
  }

  public Vector diff() {
    return lock.minus(point);
  }

  @Override
  public double error() {
    Vector diff = diff();
    return diff.x * diff.x + diff.y * diff.y;
  }

  @Override
  public List<Vector> params() {
    return Collections.singletonList(point);
  }

  @Override
  public List<Vector> gradient() {
    return Collections.singletonList(diff());
  }

  @Override
  public Object debug() {
    return point;
  }
}
