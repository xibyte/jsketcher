package cad.fx;

import cad.math.Vector;
import eu.mihosoft.vrl.v3d.Vector3d;
import javafx.geometry.Point3D;
import javafx.scene.shape.Sphere;

import java.util.ArrayList;

public class Sketcher {

  public final Sketch sketch;

  public Sketcher(Sketch sketch) {
    this.sketch = sketch;
    if (sketch.polygons.isEmpty()) {
      sketch.polygons.add(new ArrayList<>());
    }
  }

  public void addPoint(Point3D point) {
    sketch.polygons.get(sketch.polygons.size() - 1).add(new Vector(point.getX(), point.getY(), point.getZ()));
    Sphere pt = new Sphere(1);
    pt.setTranslateX(point.getX());
    pt.setTranslateY(point.getY());
    pt.setTranslateZ(point.getZ());
    sketch.drawLayer.getChildren().addAll(pt);
  }

  public void commitOperation() {
    sketch.polygons.add(new ArrayList<>());
  }
}
