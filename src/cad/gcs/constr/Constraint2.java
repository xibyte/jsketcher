package cad.gcs.constr;

import cad.math.Vector;

import java.util.List;

public interface Constraint2 {
  double error();

  List<Vector> params();

  List<Vector> gradient();

  Object debug();
}
