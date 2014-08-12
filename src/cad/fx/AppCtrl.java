package cad.fx;

import cad.fx.viewer.Viewer3D;
import javafx.fxml.Initializable;
import javafx.scene.Group;
import javafx.scene.Node;
import javafx.scene.control.Button;

import java.net.URL;
import java.util.ResourceBundle;

import static java.util.Collections.singletonList;

public class AppCtrl implements Initializable {

  private final CadContext cadContext = new CadContext();

  public Viewer3D viewer;
  public Button beginSketching;
  public Button endSketching;
  public Button pad;
  public Button cut;

  @Override
  public void initialize(URL location, ResourceBundle resources) {
    Group content = new Group(getInitObject());
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

  private Node getInitObject() {

    Surface square = Utils3D.createSquare(100);
//    square = square.flip();
    return new CSGNode(Utils3D.getMesh(singletonList(square)), cadContext);

//
//    CSG init = new Cube(100).toCSG().difference(new Cylinder(30, 100, 10).toCSG());
//    return new CSGNode(Utils3D.getFXMesh(init), cadContext);
  }
}
