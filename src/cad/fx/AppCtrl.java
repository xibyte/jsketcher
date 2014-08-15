package cad.fx;

import cad.fx.viewer.Viewer3D;
import javafx.fxml.Initializable;
import javafx.scene.Group;
import javafx.scene.control.Button;

import java.net.URL;
import java.util.List;
import java.util.ResourceBundle;

public class AppCtrl implements Initializable {

  private final CadContext cadContext = new CadContext();

  public Viewer3D viewer;
  public Button beginSketching;
  public Button endSketching;
  public Button pad;
  public Button cut;

  @Override
  public void initialize(URL location, ResourceBundle resources) {
    Group content = new Group();
    setInitObject(content);
    viewer.setContent(content);
    beginSketching.setOnAction(event -> {
      cadContext.beginSketching();
    });
    endSketching.setOnAction(event -> {
      cadContext.endSketching();
    });
    pad.setOnAction(event -> {
      cadContext.pad(50);
    });
  }

  private void setInitObject(Group parent) {
    List<Polygon> cube = Utils3D.createCube(100);
    parent.getChildren().addAll(cadContext.toNodes(cube));
//
//    CSG init = new Cube(100).toCSG().difference(new Cylinder(30, 100, 10).toCSG());
//    return new CSGNode(Utils3D.getFXMesh(init), cadContext);
  }
}
