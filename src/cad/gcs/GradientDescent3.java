package cad.gcs;

import cad.gcs.constr.Constraint2;
import cad.gcs.constr.Perpendicular2;
import cad.math.Vector;
import gnu.trove.list.TDoubleList;
import gnu.trove.list.array.TDoubleArrayList;
import gnu.trove.map.hash.TObjectDoubleHashMap;

import java.lang.*;
import java.util.HashMap;
import java.util.List;

public class GradientDescent3 {

  private static final double DBL_EPSILON = Double.MIN_VALUE;

  static double EPS = 0.0000001;

  public static void solve(Constraint2... constrs) {

    TObjectDoubleHashMap<Vector> alphas = new TObjectDoubleHashMap<>();
    double[] values = new double[constrs.length];
    double[] calphas = new double[constrs.length];

    for (int k = 0; k < constrs.length; k++) {
      Constraint2 constr = constrs[k];
      for (Vector p : constr.params()) {
        alphas.put(p, 1);
      }
      values[k] = (value(constr));
    }


    for (int i = 0; i < 100000; i++) {
      for (int k = 0; k < constrs.length; k++) {
        Constraint2 constr = constrs[k];
        List<Vector> params = constr.params();
        double calpha = calphas[k];
        List<Vector> grad = constr.gradient();
        for (int j = 0; j < grad.size(); j++) {
          Vector gr = grad.get(j);
          Vector param = params.get(j);
          double alpha = alphas.get(param);
          Vector step = gr.normalize().multi(alpha);
          param._plus(step);
        }
        double err = value(constr);
        double last = values[k];
//        java.lang.System.out.println(constr.debug() + "===" + err + "====>" + alpha );
        if (err < last) {
        } else {
          boolean divergence = true;
          for (double a : calphas) {
            if (a >= EPS) {
              divergence = false;
            }
          }
          if (divergence) {
            return;
          } else {
            calpha /= 3;
            calphas[k] = calpha;
            for (Vector param : params) {
              alphas.put(param, Math.min(alphas.get(param), calpha));
            }
          }
        }
        values[k] = err;
      }
    }
  }

  private static double value(Constraint2 constr) {
    double err = constr.error();
    return Math.abs(err);
  }
}
