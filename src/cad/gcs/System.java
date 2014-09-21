package cad.gcs;

public interface System {

  Param[] getParams();

  double[] params();
  
  void gradient(double[] out);
  
  int pSize();
}
