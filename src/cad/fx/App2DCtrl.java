package cad.fx;

import cad.gcs.Constraint;
import cad.gcs.Solver;
import cad.gcs.constr.Perpendicular;
import cad.math.Vector;
import javafx.event.ActionEvent;
import javafx.fxml.Initializable;
import javafx.scene.Group;
import javafx.scene.control.Button;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Line;

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
    content.getChildren().addAll(l1, l2);


    solve.setOnAction(event -> {

      Vector a1 = new Vector(l1.getStartX(), l1.getStartY());
      Vector b1 = new Vector(l1.getEndX(),   l1.getEndY());
      Vector a2 = new Vector(l2.getStartX(), l2.getStartY());
      Vector b2 = new Vector(l2.getEndX(),   l2.getEndY());
      Perpendicular perpendicular = new Perpendicular(a1, b1, a2, b2);

      List<Constraint> parallels = Arrays.<Constraint>asList(perpendicular);
      Solver.SubSystem subSystem = new Solver.SubSystem(parallels);
      Solver.solve_DL(subSystem);

      perpendicular.out(a1, b1, a2, b2);

      l1.setStartX(a1.x);
      l1.setStartY(a1.y);
      l1.setEndX(b1.x);
      l1.setEndY(b1.y);

      l2.setStartX(a2.x);
      l2.setStartY(a2.y);
      l2.setEndX(b2.x);
      l2.setEndY(b2.y);
    });

  }

  private void solve(ActionEvent e) {

//    UnconstrainedLeastSquares opt = FactoryOptimization.leastSquaresTrustRegion(100, RegionStepType.DOG_LEG_FTF, false);

  }

  private void setInitObject(Group parent) {
//    CSG init = new Cube(100).toCSG().difference(new Cylinder(30, 100, 10).toCSG());
//    return new CSGNode(Utils3D.getFXMesh(init), cadContext);
  }
}
