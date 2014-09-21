package cad.fx;

import cad.gcs.Constraint;
import cad.gcs.GradientDescent;
import cad.gcs.GradientDescent2;
import cad.gcs.GradientDescent3;
import cad.gcs.Param;
import cad.gcs.Solver;
import cad.gcs.constr.Constraint2;
import cad.gcs.constr.Parallel;
import cad.gcs.constr.Perpendicular;
import cad.gcs.constr.Perpendicular2;
import cad.gcs.constr.X;
import cad.gcs.constr.XY;
import cad.math.Vector;
import gnu.trove.list.TDoubleList;
import javafx.event.ActionEvent;
import javafx.fxml.Initializable;
import javafx.scene.Group;
import javafx.scene.control.Button;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Line;
import org.apache.commons.math3.analysis.MultivariateMatrixFunction;
import org.apache.commons.math3.analysis.MultivariateVectorFunction;
import org.apache.commons.math3.analysis.function.Max;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.optim.ConvergenceChecker;
import org.apache.commons.math3.optim.InitialGuess;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.MaxIter;
import org.apache.commons.math3.optim.PointVectorValuePair;
import org.apache.commons.math3.optim.nonlinear.vector.ModelFunction;
import org.apache.commons.math3.optim.nonlinear.vector.ModelFunctionJacobian;
import org.apache.commons.math3.optim.nonlinear.vector.Target;
import org.apache.commons.math3.optim.nonlinear.vector.Weight;
import org.apache.commons.math3.optim.nonlinear.vector.jacobian.GaussNewtonOptimizer;

import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.ResourceBundle;

public class App2DCtrl implements Initializable {

  private final CadContext cadContext = new CadContext();

  public Pane viewer;
  public Button solve;

  @Override
  public void initialize(URL location, ResourceBundle resources) {
    Group content = new Group();
    setInitObject(content);
    viewer.getChildren().setAll(content);


    Line l1 = new Line(100, 100, 300, 600);
    Line l2 = new Line(400, 600, 600, 100);
    Line l3 = new Line(650, 100, 800, 600);

    content.getChildren().addAll(l1, l2, l3);


    solve.setOnAction(event -> {

      Vector as = new Vector(l1.getStartX(), l1.getStartY());
      Vector ae = new Vector(l1.getEndX(),   l1.getEndY());
      Vector bs = new Vector(l2.getStartX(), l2.getStartY());
      Vector be = new Vector(l2.getEndX(),   l2.getEndY());


      Param l1p1x = new Param(l1.getStartX());
      Param l1p1y = new Param(l1.getStartY());
      Param l1p2x = new Param(l1.getEndX());
      Param l1p2y = new Param(l1.getEndY());

      Param l2p1x = new Param(l2.getStartX());
      Param l2p1y = new Param(l2.getStartY());
      Param l2p2x = new Param(l2.getEndX());
      Param l2p2y = new Param(l2.getEndY());

      Param l3p1x = new Param(l3.getStartX());
      Param l3p1y = new Param(l3.getStartY());
      Param l3p2x = new Param(l3.getEndX());
      Param l3p2y = new Param(l3.getEndY());


      Perpendicular perpendicular = new Perpendicular(
        l1p1x,
        l1p1y,
        l1p2x,
        l1p2y,
        l2p1x,
        l2p1y,
        l2p2x,
        l2p2y
      );

      Parallel parallel = new Parallel(
        l3p1x,
        l3p1y,
        l3p2x,
        l3p2y,
        l2p1x,
        l2p1y,
        l2p2x,
        l2p2y
      );


      XY xy = new XY(as, new Vector(100, 100));

      X x = new X(
        l1p1x,
        l1p1y,
        l1p2x,
        l1p2y,
        l2p1x,
        l2p1y,
        l2p2x,
        l2p2y
      );
      
      List<Constraint> constrs = Arrays.<Constraint>asList(perpendicular);
      Solver.SubSystem subSystem = new Solver.SubSystem(constrs);
//      Solver.optimize(subSystem);
//
      
      
//      while (subSystem.error() > 0.0001 ) {
        Solver.solve_LM(subSystem);
//      }
      
//      solveGC(subSystem);

      java.lang.System.out.println("ANGLE |- :" + perpendicular.angle());
      java.lang.System.out.println("ANGLE || :" + parallel.angle());

//      Constraint2 constr = xy;

//      Constraint constr = perpendicular;
//      GradientDescent.solve(constr);
//      perpendicular.out(a1, b1, a2, b2);

//      GradientDescent2.solve(constr);


//      l1.setStartX(as.x);
//      l1.setStartY(as.y);
//      l1.setEndX(ae.x);
//      l1.setEndY(ae.y);
//
//      l2.setStartX(bs.x);
//      l2.setStartY(bs.y);
//      l2.setEndX(be.x);
//      l2.setEndY(be.y);

      l1.setStartX(l1p1x.get());
      l1.setStartY(l1p1y.get());
      l1.setEndX(l1p2x.get());
      l1.setEndY(l1p2y.get());

      l2.setStartX(l2p1x.get());
      l2.setStartY(l2p1y.get());
      l2.setEndX(l2p2x.get());
      l2.setEndY(l2p2y.get());

      l3.setStartX(l3p1x.get());
      l3.setStartY(l3p1y.get());
      l3.setEndX(l3p2x.get());
      l3.setEndY(l3p2y.get());

//      scale(l1);
//      scale(l2);
//      scale(l3);
    });
  }

  double xxx = 100;

  private void scale(Line l) {

    Vector v = new Vector(l.getEndX() - l.getStartX(), l.getEndY() - l.getStartY());
    v = v.normalize().multi(200);
    l.setStartX(xxx += 100.);
    l.setStartY(500.);

    l.setEndX(l.getStartX() + v.x);
    l.setEndY(l.getStartY() + v.y);
  }

  private void solveGC(final Solver.SubSystem subSystem) {
    GaussNewtonOptimizer optimizer = new GaussNewtonOptimizer((iteration, previous, current) -> {
      return subSystem.value() < 0.00001;
    }) {

      @Override
      protected double[] computeResiduals(double[] objectiveValue) {
        TDoubleList residual = subSystem.calcResidual();
        return residual.toArray();
      }

    };
    double[] wieght = new double[subSystem.cSize()];
    Arrays.fill(wieght, 1);
    optimizer.optimize(
            new MaxEval(10000),
            new MaxIter(10000),
            new InitialGuess(subSystem.getParams().toArray()),
            new Target(new double[subSystem.cSize()]),
            new Weight(wieght),
            new ModelFunctionJacobian(point -> {
              subSystem.setParams(point);
              return subSystem.makeJacobi().getData();
            }),
            new ModelFunction(new MultivariateVectorFunction() {
              @Override
              public double[] value(double[] point) throws IllegalArgumentException {
                subSystem.setParams(point);
                return subSystem.getValues().toArray();
              }
            })

    );
  }

  private void solve(ActionEvent e) {

//    UnconstrainedLeastSquares opt = FactoryOptimization.leastSquaresTrustRegion(100, RegionStepType.DOG_LEG_FTF, false);

  }

  private void setInitObject(Group parent) {
//    CSG init = new Cube(100).toCSG().difference(new Cylinder(30, 100, 10).toCSG());
//    return new CSGNode(Utils3D.getFXMesh(init), cadContext);
  }
}
