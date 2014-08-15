package cad.fx;

import cad.math.Vector;
import javafx.scene.Group;

import java.util.ArrayList;
import java.util.List;

public class Sketch {

  public final Polygon owner;
  public final List<List<Vector>> polygons = new ArrayList<>();
  public final Group drawLayer = new Group();

  public Sketch(Polygon owner) {
    this.owner = owner;
  }
}
