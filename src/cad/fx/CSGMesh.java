package cad.fx;

import eu.mihosoft.vrl.v3d.Polygon;
import gnu.trove.map.TIntObjectMap;
import gnu.trove.map.hash.TIntObjectHashMap;
import javafx.scene.shape.TriangleMesh;

public class CSGMesh extends TriangleMesh {

  public final TIntObjectMap<Surface> polygons = new TIntObjectHashMap<>();

}
