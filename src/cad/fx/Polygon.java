package cad.fx;

import cad.math.HMath;
import cad.math.Matrix;
import cad.math.Vector;
import org.poly2tri.Poly2Tri;
import org.poly2tri.geometry.polygon.PolygonPoint;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

public class Polygon {

  public final Vector normal;
  public final List<Vector> shell;
  public final List<List<Vector>> holes;

  private List<Vector[]> triangles;

  public Polygon(List<Vector> shell) {
    this(shell, Collections.emptyList());
  }

  public Polygon(List<Vector> shell, List<List<Vector>> holes) {
    this(normalOfCCWSeq(shell.get(0), shell.get(1), shell.get(2)), shell, holes);
  }

  public Polygon(Vector normal, List<Vector> shell, List<List<Vector>> holes) {
    this.normal = normal.normalize();
    this.shell = shell;
    this.holes = holes;
    checkPolygon(shell);
    for (List<Vector> hole : holes) {
      if (hole.size() < 3) {
        checkPolygon(hole);
      }
    }
  }

  public Polygon fixCCW() {
    if (!normal.slightlyEqualTo(normalOfCCWSeq(shell.get(0), shell.get(1), shell.get(2)))) {
      List<Vector> shell = new ArrayList<>(this.shell);
      Collections.reverse(shell);
      return new Polygon(normal, shell, holes);
    }
    return this;
  }

  
  public Vector[] someBasis() {
    Vector x = shell.get(1).minus(shell.get(0)).normalize();
    Vector y = normal.cross(x).normalize();
    return new Vector[] {x, y, normal};
  }
  
  private void checkPolygon(List<Vector> shell) {
    if (shell.size() < 3) {
      throw new IllegalArgumentException("Polygon should contain at least 3 point");
    }
  }

  public List<Vector[]> getTriangles() {
    if (triangles == null) {
      triangulate();
    }
    return triangles;
  }

  private void triangulate() {

    Matrix _3dTransformation = new Matrix(someBasis());
    Matrix _2dTransformation = _3dTransformation.invert();

    List<PolygonPoint> shellPoints = shell.stream()
      .map(vector -> HMath.cross(_2dTransformation, vector))
      .map(vector -> new PolygonPoint(vector.x, vector.y, vector.z))
      .collect(toList());

    org.poly2tri.geometry.polygon.Polygon polygon = new org.poly2tri.geometry.polygon.Polygon(shellPoints);

    for (List<Vector> hole : holes) {

      List<PolygonPoint> holePoints = hole.stream()
        .map(vector -> HMath.cross(_2dTransformation, vector))
        .map(vector -> new PolygonPoint(vector.x, vector.y, vector.z))
        .collect(toList());

      polygon.addHole(new org.poly2tri.geometry.polygon.Polygon(holePoints));
    }

    Poly2Tri.triangulate(polygon);

    triangles = polygon.getTriangles().stream()
      .map(tr ->
        new Vector[]{
          HMath.cross(_3dTransformation, new Vector(tr.points[0].getX(), tr.points[0].getY(), tr.points[0].getZ())),
          HMath.cross(_3dTransformation, new Vector(tr.points[1].getX(), tr.points[1].getY(), tr.points[1].getZ())),
          HMath.cross(_3dTransformation, new Vector(tr.points[2].getX(), tr.points[2].getY(), tr.points[2].getZ()))
        })
      .collect(Collectors.<Vector[]>toList());

    setupNormal(triangles, normal);
  }

  public static void setupNormal(List<Vector[]> triangles, Vector normal) {
    
    for (Vector[] triangle : triangles) {
      if (!normalOfCCWSeq(triangle[0], triangle[1], triangle[2]).slightlyEqualTo(normal)) {
        reverse(triangle);
        System.out.println("");
      }
    }
  }

  public static Vector normalOfCCWSeq(Vector v0, Vector v1, Vector v2) {
    return v1.minus(v0).cross(v2.minus(v0)).normalize();
  }

  private static void reverse(Vector[] triangle) {
    Vector first = triangle[0];
    triangle[0] = triangle[2];
    triangle[2] = first;
  }

  public Polygon flip() {
    return new Polygon(normal.negate(), shell, holes);
  }

  public static List<Polygon> extrude(Polygon source, Vector target) {

    double dotProduct = target.normalize().dot(source.normal);
    if (dotProduct == 0) {
      return Collections.emptyList();
    }
    if (dotProduct > 0) {
      source = source.flip();
    }
    source = source.fixCCW();

    List<Polygon> poly = new ArrayList<>();
    poly.add(source);

    Polygon lid = source.shift(target).flip();
    poly.add(lid);

    for (int i = 0; i < source.shell.size(); i++) {
      Polygon face = new Polygon(Arrays.asList(
        get(source.shell, i - 1),
        get(lid.shell, i - 1),
        get(lid.shell, i),
        get(source.shell, i)
      ));
      poly.add(face);
    }
    return poly;
  }

  public static <T> T get(List<T> list, int i) {
    i = i % list.size();
    if (i < 0) {
      i = list.size() + i;
    }
    return list.get(i);
  }

  public Polygon shift(Vector target) {
    List<Vector> shell = this.shell.stream().map(vector -> vector.plus(target)).collect(toList());
    List<List<Vector>> holes = new ArrayList<>();
    for (List<Vector> hole : this.holes) {
      holes.add(hole.stream().map(vector -> vector.plus(target)).collect(toList()));
    }
    return new Polygon(normal, shell, holes);
  }
}
