package cad.gcs;

import gnu.trove.list.TDoubleList;
import org.apache.commons.math3.optim.InitialGuess;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.MaxIter;
import org.apache.commons.math3.optim.PointVectorValuePair;
import org.apache.commons.math3.optim.nonlinear.vector.ModelFunction;
import org.apache.commons.math3.optim.nonlinear.vector.ModelFunctionJacobian;
import org.apache.commons.math3.optim.nonlinear.vector.Target;
import org.apache.commons.math3.optim.nonlinear.vector.Weight;
import org.apache.commons.math3.optim.nonlinear.vector.jacobian.LevenbergMarquardtOptimizer;

import java.lang.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class GlobalSolver {

  public static void globalSolve(Solver.SubSystem subSystem, Runnable linearSolvedCallback) {

//    for (Constraint c : subSystem.constraints) {
//      if (c instanceof Reconcilable) {
//        ((Reconcilable) c).reconcile();
//      }
//    }

    double eps = 0.0001;
    java.lang.System.out.println("Solve system with error: " + subSystem.value());
    int count = 0;

    solveLM_COMMONS(subSystem);
//    Solver.solve_BFGS(subSystem, false);
//    Solver.solve_DL(subSystem);
//    Solver.solve_LM(subSystem);

    linearSolvedCallback.run();
    if (true) return;

    while (subSystem.valueSquared() > eps && (count++ < 1000)) {
      solveLM_COMMONS(subSystem);
//      Solver.solve_BFGS(subSystem, false);
//      Solver.solve_DL(subSystem);
//    Solver.solve_LM(subSystem);
      if (Math.abs(subSystem.valueSquared()) > eps) {
//        solveWorse(subSystem, eps);
        if(subSystem.constraints.size() > 1) {
          Solver.SubSystem shrunk = shrink(subSystem);
          globalSolve(shrunk, linearSolvedCallback);
        }
      }
      linearSolvedCallback.run();
    }
  }

  public static void globalSolve2(Solver.SubSystem subSystem, Runnable linearSolvedCallback) {


    double eps = 0.0001;
    java.lang.System.out.println("Solve system with error: " + subSystem.value());
    int count = 0;

    List<Solver.SubSystem> subSystems = subSystem.splitUp();
    for (Solver.SubSystem system : subSystems) {
      java.lang.System.out.println("Solve subsystem: " + subSystem.value());
      solveLM_COMMONS(system);
//      Solver.solve_BFGS(system, false);
//      Solver.solve_LM(system);
      java.lang.System.out.println("Subsystem solved: " + subSystem.value());
      linearSolvedCallback.run();
    }
    linearSolvedCallback.run();

//    globalSolve2(subSystem, linearSolvedCallback);
  }


  public static void solveLM_COMMONS(final Solver.SubSystem subSystem) {
    double eps = 1e-10, eps1 = 1e-80;
      double tau = 1e-3;

    LevenbergMarquardtOptimizer optimizer = new LevenbergMarquardtOptimizer();

    double[] wieght = new double[subSystem.cSize()];
    Arrays.fill(wieght, 1);
    PointVectorValuePair result = optimizer.optimize(
      new MaxEval(100000),
      new MaxIter(100000),
      new InitialGuess(subSystem.getParams().toArray()),
      new Target(new double[subSystem.cSize()]),
      new Weight(wieght),
      getJacobian(subSystem),
      getFunction(subSystem)
    );

    subSystem.setParams(result.getPoint());
  }

  private static ModelFunction getFunction(Solver.SubSystem subSystem) {
    return new ModelFunction(point -> {
      subSystem.setParams(point);
      return subSystem.getValues().toArray();
    });
  }

  private static ModelFunctionJacobian getJacobian(Solver.SubSystem subSystem) {
    return new ModelFunctionJacobian(point -> {
      subSystem.setParams(point);
      return subSystem.makeJacobi().getData();
    });
  }

  private static Solver.SubSystem shrink(Solver.SubSystem system) {
    TDoubleList residuals = system.calcResidual();
    int minIdx = residuals.indexOf(residuals.min());
    ArrayList<Constraint> constrs = new ArrayList<>(system.constraints);
    constrs.remove(minIdx);
    return new Solver.SubSystem(constrs);
  }


}
