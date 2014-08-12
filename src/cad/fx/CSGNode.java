package cad.fx;

import eu.mihosoft.vrl.v3d.CSG;
import eu.mihosoft.vrl.v3d.Polygon;
import javafx.scene.Group;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.shape.MeshView;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CSGNode extends MeshView {

  private final CadContext context;

  public CSGNode(CSGMesh mesh, CadContext context) {
    super(mesh);
    this.context = context;
    setMaterial(Utils3D.DEFAULT_MATERIAL);
    setOnMouseEntered(e -> {
      context.highlightManger.selectExclusively(this);
    });
    setOnMouseExited(e -> {
      context.highlightManger.getSelection().clear();
    });
    setOnMouseClicked(e -> {
      context.clickOnNode(this, e);
    });
  }

  private void highlight(Polygon poly) {
    System.out.println(poly);
  }
  
  private void select(Polygon poly) {
    System.out.println(poly);
  }

  public final Map<Surface, Sketch> sketches = new HashMap<>();

  public Sketch getSketch(Surface surface) {
    Sketch sketch = sketches.get(surface);
    if (sketch == null) {
      sketch = new Sketch(surface);
      ((Group) getParent()).getChildren().add(sketch.drawLayer);
      sketches.put(surface, sketch);
    }
    return sketch;
  }

}
