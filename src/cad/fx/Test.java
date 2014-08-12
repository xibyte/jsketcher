package cad.fx;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Line;
import javafx.scene.transform.Translate;
import javafx.stage.Stage;
import org.poly2tri.Poly2Tri;
import org.poly2tri.geometry.polygon.Polygon;
import org.poly2tri.geometry.polygon.PolygonPoint;
import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.delaunay.DelaunayTriangle;

import java.util.Arrays;
import java.util.List;

public class Test extends Application {

  public static void main(String[] args) {
    System.setProperty("prism.dirtyopts", "false");
    launch(args);
  }

  @Override
  public void start(Stage primaryStage) throws Exception {
    Pane pane = new Pane();
    Scene scene = new Scene(pane, 600, 600);




    Polygon polygon = new Polygon(Arrays.asList(
        new PolygonPoint(0, 0),
//        new PolygonPoint(200, 100),
        new PolygonPoint(400, 0),
        new PolygonPoint(400, 400),
        new PolygonPoint(0, 400)
    ));

        Polygon hole = new Polygon(Arrays.asList(
            new PolygonPoint(50, 50),
            new PolygonPoint(50, 100),
            new PolygonPoint(100, 100),
            new PolygonPoint(100, 50)
        ));

    polygon.addHole(hole);

    Poly2Tri.triangulate(polygon);


    for (DelaunayTriangle triangle : polygon.getTriangles()) {
      show(pane, Arrays.asList(triangle.points));
    }

    pane.getTransforms().add(new Translate(10, 10));
    show(pane, polygon);

    primaryStage.setScene(scene);
    primaryStage.show();
  }

  private void show(Pane pane, Polygon polygon) {
    show(pane, polygon.getPoints());
  }

  private void show(Pane pane, List<TriangulationPoint> points) {

    TriangulationPoint first = points.get(0);
    TriangulationPoint prev = first;
    for (TriangulationPoint point : points.subList(1, points.size())) {
      pane.getChildren().addAll(new Line(prev.getX(), prev.getY(), point.getX(), point.getY()));
      prev = point;
    }
    pane.getChildren().addAll(new Line(prev.getX(), prev.getY(), first.getX(), first.getY()));
  }

}
