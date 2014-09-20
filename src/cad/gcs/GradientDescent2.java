package cad.gcs;

import cad.gcs.constr.Constraint2;
import cad.gcs.constr.Perpendicular2;
import cad.math.Vector;

import java.lang.*;
import java.util.List;

public class GradientDescent2 {

  private static final double DBL_EPSILON = Double.MIN_VALUE;

  static double EPS = 0.0000000001;
  
  public static void solve(Constraint2 constr) {


    double last = value(constr);

    double alpha = .01;

    List<Vector> params = constr.params();
    for (int i = 0; i < 100000; i++) {


      List<Vector> grad = constr.gradient();
      for (int j = 0; j < grad.size(); j++) {
        Vector gr = grad.get(j);
        Vector param = params.get(j);
        Vector step = gr.normalize().multi(alpha);
        param._plus(step);
      }
      double err = value(constr);

      java.lang.System.out.println(constr.debug() + "===" + err + "====>" + alpha );
      if (err < last) {

      } else {
        if (alpha < EPS) {
          return;
        } else {
          alpha /= 3;
        }
      }
      last = err;
    }
  }

  private static double value(Constraint2 constr) {
    double err = constr.error();
    return Math.abs(err);
  }
}
