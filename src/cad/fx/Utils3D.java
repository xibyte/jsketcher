package cad.fx;

import cad.math.Vector;
import javafx.scene.paint.Color;
import javafx.scene.paint.PhongMaterial;
import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.delaunay.DelaunayTriangle;

import java.util.Arrays;
import java.util.List;

public class Utils3D {

  public static final PhongMaterial DEFAULT_MATERIAL = new PhongMaterial();
  public static final PhongMaterial SELECTED_MATERIAL = new PhongMaterial();
  public static final PhongMaterial HIGHLIGHTED_MATERIAL = new PhongMaterial();

  static {
//    DEFAULT_MATERIAL.setDiffuseColor(Color.LIGHTBLUE);
//    DEFAULT_MATERIAL.setSpecularColor(Color.WHITE);

    DEFAULT_MATERIAL.setDiffuseColor(Color.LIGHTSTEELBLUE);
//    DEFAULT_MATERIAL.setSpecularColor(Color.LIGHTBLUE);

    SELECTED_MATERIAL.setDiffuseColor(Color.AZURE);
//    SELECTED_MATERIAL.setSpecularColor(Color.SEAGREEN); //disable reflection

    HIGHLIGHTED_MATERIAL.setDiffuseColor(Color.LIGHTGOLDENRODYELLOW);
//    HIGHLIGHTED_MATERIAL.setSpecularColor(Color.GOLD);

//    DEFAULT_MATERIAL.setDiffuseMap(new Image(Utils3D.class.getResource("tex.png").toExternalForm()));
  }


  public static CSGMesh getMesh(List<Plane> planes) {

    CSGMesh mesh = new CSGMesh();

    int faceCounter = 0;

    for (Plane plane : planes) {


      for (Vector[] triangle : plane.getTriangles()) {


        mesh.getPoints().addAll(
                (float) triangle[0].x,
                (float) triangle[0].y,
                (float) triangle[0].z
        );

        mesh.getTexCoords().addAll(0); // texture (not covered)
        mesh.getTexCoords().addAll(0);


        mesh.getPoints().addAll(
                (float) triangle[1].x,
                (float) triangle[1].y,
                (float) triangle[1].z
        );

        mesh.getTexCoords().addAll(0); // texture (not covered)
        mesh.getTexCoords().addAll(0);

        mesh.getPoints().addAll(
                (float) triangle[2].x,
                (float) triangle[2].y,
                (float) triangle[2].z
        );


        mesh.getTexCoords().addAll(0); // texture (not covered)
        mesh.getTexCoords().addAll(0);

        int counter = faceCounter * 3;
        mesh.getFaces().addAll(
                counter, // first vertex
                0, // texture (not covered)
                counter + 1, // second vertex
                0, // texture (not covered)
                counter + 2, // third vertex
                0 // texture (not covered)
        );
        mesh.polygons.put(faceCounter, plane);
        ++faceCounter;

      } // end if #verts >= 3

    } // end for polygon

    return mesh;
  }

  public static CSGMesh getFXMesh(List<DelaunayTriangle> triangles) {

    CSGMesh mesh = new CSGMesh();

    int faceCounter = 0;

    for (DelaunayTriangle p : triangles) {


      TriangulationPoint firstVertex = p.points[0];

      mesh.getPoints().addAll(
              p.points[2].getXf(),
              p.points[2].getYf(),
              p.points[2].getZf()
      );

      mesh.getTexCoords().addAll(0); // texture (not covered)
      mesh.getTexCoords().addAll(0);

      mesh.getPoints().addAll(
              p.points[1].getXf(),
              p.points[1].getYf(),
              p.points[1].getZf()
      );

      mesh.getTexCoords().addAll(0); // texture (not covered)
      mesh.getTexCoords().addAll(0);

      mesh.getPoints().addAll(
              p.points[0].getXf(),
              p.points[0].getYf(),
              p.points[0].getZf()
      );

      mesh.getTexCoords().addAll(0); // texture (not covered)
      mesh.getTexCoords().addAll(0);

      int counter = faceCounter * 3;
      mesh.getFaces().addAll(
              counter, // first vertex
              0, // texture (not covered)
              counter + 1, // second vertex
              0, // texture (not covered)
              counter + 2, // third vertex
              0 // texture (not covered)
      );
//      mesh.polygons.put(faceCounter, p);
      ++faceCounter;

    } // end for polygon

    return mesh;
  }

  public static List<Plane> createCube(double width) {
    Plane square = createSquare(width);
    return Plane.extrude(square, square.normal.scale(width)); 
  }

  public static Plane createSquare(double width) {

    width /= 2;

    List<Vector> shell = Arrays.asList(
            new Vector(-width, -width),
            new Vector(width, -width),
            new Vector(width, width, 0),
            new Vector(-width, width, 0)
    );

//    width /= 3;
//    org.poly2tri.geometry.polygon.Polygon hole = new org.poly2tri.geometry.polygon.Polygon(Arrays.asList(
//        new PolygonPoint(-width, -width),
//        new PolygonPoint(width, -width),
//        new PolygonPoint(width, width, 100),
//        new PolygonPoint(-width, width, 100)
//    ));
//
//    polygon.addHole(hole);

    return new Plane(shell);
  }
}
