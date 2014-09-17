package cad.gcs;

import java.util.List;

public interface Constraint extends System {

  double error();

  void set(double[] input);

}
