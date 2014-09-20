package cad.gcs;

import cad.gcs.constr.Perpendicular;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealVector;

public class GradientDescent {
  
  static double EPS = 0.0000001;
  
  public static void solve(Constraint constr) {


    double last = value(constr);
    
    double alpha = 10;
    int pSize = constr.pSize();

    RealVector steps = new ArrayRealVector(pSize);
    steps.set(10);
    
    for (int i = 0; i < 1000000; i++) {


      double[] gradData = new double[pSize];
      constr.gradient(gradData);      
      ArrayRealVector grad = new ArrayRealVector(gradData);

      RealVector dir = grad.mapDivide(grad.getNorm());
      dir = dir.mapMultiply( alpha);
      java.lang.System.out.println(dir.getNorm());


      ArrayRealVector params = new ArrayRealVector(constr.params());
      params = params.add(dir);
      constr.set(params.toArray());
      java.lang.System.out.println(((Perpendicular) constr).angle());
//      constr.step(alpha);
      double err = value(constr);
      
      if (err < last) {

      } else if (alpha < EPS) {
        return;
      } else {
        alpha /= 3;       
      }
      last = err;
    }
  }

  private static double value(Constraint constr) {
    double err = constr.error();
    return err * err;
  }
}
