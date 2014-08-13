package cad.fx;

import gnu.trove.map.TIntObjectMap;
import gnu.trove.map.hash.TIntObjectHashMap;
import javafx.scene.shape.TriangleMesh;

public class CSGMesh extends TriangleMesh {

  public final TIntObjectMap<Plane> polygons = new TIntObjectHashMap<>();

}
