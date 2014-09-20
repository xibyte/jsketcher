package cad.fx;

import cad.math.Vector;
import javafx.scene.Node;
import javafx.scene.input.MouseEvent;
import javafx.scene.input.PickResult;
import javafx.scene.paint.PhongMaterial;
import javafx.scene.shape.MeshView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static java.util.stream.Collectors.toList;

public class CadContext {

  public Sketcher sketcher;
  public Selection selection;
  public final SelectionManager selectionManger = new SelectionManager();
  public final SelectionManager highlightManger = new SelectionManager();

  
  class MaterialChangeListener implements SelectionManager.Listener {

    public final PhongMaterial onSelect;
    public final PhongMaterial onDeselect;
    private SelectionManager dependency;
    
    MaterialChangeListener(PhongMaterial onSelect, PhongMaterial onDeselect, SelectionManager dependency) {
      this.onSelect = onSelect;
      this.onDeselect = onDeselect;
      this.dependency = dependency;
    }

    public void added(List<Node> nodes) {
      if (dependency != null) {
        nodes = filter(nodes, dependency);
      }
      setMaterial(nodes, onSelect);
    }

    public void removed(List<Node> nodes) {
      if (dependency != null) {
        nodes = filter(nodes, dependency);
      }
      setMaterial(nodes, onDeselect);
    }
    
    private List<Node> filter(List<Node> nodes, SelectionManager dependency) {
      nodes = new ArrayList<>(nodes);
      nodes.removeAll(selectionManger.getSelection());
      return nodes;
    }
  }
  
  {
    selectionManger.addListener(new MaterialChangeListener(Utils3D.SELECTED_MATERIAL, Utils3D.DEFAULT_MATERIAL, null));
    highlightManger.addListener(new MaterialChangeListener(Utils3D.HIGHLIGHTED_MATERIAL, Utils3D.DEFAULT_MATERIAL, selectionManger));
  }

  private void setMaterial(List<Node> nodes, PhongMaterial material) {
    for (Node node : nodes) {
      if (node instanceof MeshView) {
        ((MeshView) node).setMaterial(material);
      }
    }
  }

  public void clickOnNode(CSGNode csgNode, MouseEvent e) {
    selectionManger.selectExclusively(csgNode);
    PickResult pickResult = e.getPickResult();
    int face = pickResult.getIntersectedFace();
    CSGMesh csgMesh = (CSGMesh) csgNode.getMesh();
    Polygon poly = csgMesh.polygons.get(face);
    System.out.println(poly);
    if (poly != null) {
      if (selection != null) {
        boolean isSameNode = selection.sameTo(csgNode, poly);
        if (sketcher == null && !isSameNode) {
          selection = new Selection(csgNode, poly);
        }
        if (sketcher != null && isSameNode) {
          sketcher.addPoint(pickResult.getIntersectedPoint());
        }
      } else {
        if (sketcher == null) {
          selection = new Selection(csgNode, poly);
        }
      }
    }
  }

  public void beginSketching() {
    if (sketcher != null || selection == null) {
      return;
    }
    sketcher = new Sketcher(selection.csgNode.getSketch(selection.poly));
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

    Sketch sketch = selection.csgNode.getSketch(selection.poly);
    Vector dir = sketch.owner.normal.multi(height);
    for (List<Vector> polygon : sketch.polygons) {
      if (polygon.isEmpty()) {
        continue;
      }

      Polygon poly = new Polygon(sketch.owner.normal, polygon, Collections.emptyList());
      List<Polygon> extruded = Polygon.extrude(poly, dir);

      for (Polygon s : extruded) {
        sketch.drawLayer.getChildren().addAll(toNodes(extruded));// fixme
      }
//      CSG pad = Extrude.points(dir, polygon);
    }
  }

  public List<CSGNode> toNodes(List<Polygon> extruded) {
    return extruded.stream().map(this::toNode).collect(toList());
  }

  public CSGNode toNode(Polygon poly) {
    return new CSGNode(Utils3D.getMesh(Collections.singletonList(poly)), this);
  }
  
  public static class Selection {

    public final CSGNode csgNode;
    public final Polygon poly;

    public Selection(CSGNode csgNode, Polygon poly) {
      this.csgNode = csgNode;
      this.poly = poly;
    }

    public boolean sameTo(CSGNode csgNode, Polygon poly) {
      return this.csgNode.equals(csgNode) && this.poly.equals(poly);
    }
  }
}
