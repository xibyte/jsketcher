package cad.gcs;

public interface System {

  Param[] getParams();

  void gradient(double[] out);
  
  int pSize();
}
