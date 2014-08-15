package cad.fx;

import javafx.scene.Group;
import javafx.scene.shape.MeshView;

import java.util.HashMap;
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

  private void highlight(eu.mihosoft.vrl.v3d.Polygon poly) {
    System.out.println(poly);
  }
  
  private void select(eu.mihosoft.vrl.v3d.Polygon poly) {
    System.out.println(poly);
  }

  public final Map<Polygon, Sketch> sketches = new HashMap<>();

  public Sketch getSketch(Polygon poly) {
    Sketch sketch = sketches.get(poly);
    if (sketch == null) {
      sketch = new Sketch(poly);
      ((Group) getParent()).getChildren().add(sketch.drawLayer);
      sketches.put(poly, sketch);
    }
    return sketch;
  }

}
