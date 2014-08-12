package cad.fx;

import cad.math.Vector;
import javafx.scene.input.MouseEvent;
import javafx.scene.input.PickResult;

import java.util.List;

public class CadContext {

  public Sketcher sketcher;
  public Selection selection;

  public void clickOnNode(CSGNode csgNode, MouseEvent e) {
    PickResult pickResult = e.getPickResult();
    int face = pickResult.getIntersectedFace();
    CSGMesh csgMesh = (CSGMesh) csgNode.getMesh();
    Surface surface = csgMesh.polygons.get(face);
    System.out.println(surface);
    if (surface != null) {
      if (selection != null) {
        boolean isSameNode = selection.sameTo(csgNode, surface);
        if (sketcher == null && !isSameNode) {
          selection = new Selection(csgNode, surface);
        }
        if (sketcher != null && isSameNode) {
          sketcher.addPoint(pickResult.getIntersectedPoint());
        }
      } else {
        if (sketcher == null) {
          selection = new Selection(csgNode, surface);
        }
      }
    }
  }

  public void beginSketching() {
    if (sketcher != null || selection == null) {
      return;
    }
    sketcher = new Sketcher(selection.csgNode.getSketch(selection.surface));
  }

  public void endSketching() {
    if (sketcher == null) {
      return;
    }
    sketcher.commitOperation();
    sketcher = null;
  }

  public void pad(double height) {
    if (selection == null) {
      return;
    }

    Sketch sketch = selection.csgNode.getSketch(selection.surface);
    for (List<Vector> polygon : sketch.polygons) {
      if (polygon.isEmpty()) {
        continue;
      }
      Vector dir = sketch.owner.normal.scale(height);

      List<Surface> extruded = Surface.extrude(sketch.owner, dir);

//      CSG pad = Extrude.points(dir, polygon);
      sketch.drawLayer.getChildren().addAll(new CSGNode(Utils3D.getMesh(extruded), this)); // fixme
    }
  }

  public static class Selection {

    public final CSGNode csgNode;
    public final Surface surface;

    public Selection(CSGNode csgNode, Surface surface) {
      this.csgNode = csgNode;
      this.surface = surface;
    }

    public boolean sameTo(CSGNode csgNode, Surface surface) {
      return this.csgNode.equals(csgNode) && this.surface.equals(surface);
    }
  }
}
