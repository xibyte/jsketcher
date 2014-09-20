package cad.gcs;

public interface Constraint extends System {

  double error();

  void step(double alpha);

  void set(double[] input);

}
