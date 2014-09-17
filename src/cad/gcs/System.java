package cad.gcs;

public interface System {
  
  double[] params();
  
  void gradient(double[] out);
}
