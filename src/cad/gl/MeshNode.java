package cad.gl;

import cad.fx.Polygon;
import cad.math.Vector;
import com.sun.javafx.scene.input.PickResultChooser;
import javafx.geometry.Point3D;
import javafx.scene.input.PickResult;
import javafx.scene.shape.CullFace;

import javax.media.opengl.GL2;
import java.util.List;

/**
 * Created by verastov
 */
public class MeshNode extends Node {

  public final List<Polygon> faces;

  static boolean DRAW_LINES = false;
  private BBox cachedBounds;

  public MeshNode(List<Polygon> faces) {
    this.faces = faces;
  }

  @Override
  void draw(GL2 gl) {
    for (Polygon face : faces) {

      //http://devernay.free.fr/cours/opengl/materials.html
//      float[] amb = {0f, 0f, 0f, 0f};
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_AMBIENT, amb, 0);

      float[] diff = {0.6901961f, 0.76862746f, 0.87058824f};
      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_DIFFUSE, diff, 0);

//      float[] spec = {0f, 0f, 0f};
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_SPECULAR, spec, 0);
//      float shine = 0.6f;
//      gl.glMaterialf(GL2.GL_FRONT, GL2.GL_SHININESS, shine * 128.0f);
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_AMBIENT_AND_DIFFUSE, blue, 0);

      gl.glShadeModel(GL2.GL_SMOOTH);
      gl.glEnable(GL2.GL_LIGHTING);
      gl.glBegin(GL2.GL_TRIANGLES);

      gl.glNormal3d(face.normal.x, face.normal.y, face.normal.z);  //very important!!
      for (Vector[] tr : face.getTriangles()) {
        gl.glVertex3d(tr[0].x, tr[0].y, tr[0].z);
        gl.glVertex3d(tr[1].x, tr[1].y, tr[1].z);
        gl.glVertex3d(tr[2].x, tr[2].y, tr[2].z);
      }
      gl.glEnd();

      if (DRAW_LINES) {
        gl.glShadeModel(GL2.GL_FLAT);
        gl.glLineWidth(1.5f);
        gl.glColor3f(255.0f, 255.0f, 255.0f);
        gl.glDisable(GL2.GL_LIGHTING);

        gl.glNormal3d(face.normal.x, face.normal.y, face.normal.z);
        for (int i = 0; i < face.shell.size(); i++) {
          gl.glBegin(GL2.GL_LINES);
          Vector a = Polygon.get(face.shell, i);
          Vector b = Polygon.get(face.shell, i + 1);
          gl.glVertex3d(a.x, a.y, a.z);
          gl.glVertex3d(b.x, b.y, b.z);
          gl.glEnd();
        }
      }
    }
  }


  public BBox computeBounds() {
    if (cachedBounds == null) {
      cachedBounds = new BBox();
      for (Polygon face : faces) {
        for (Vector vector : face.shell) {
          cachedBounds.add(vector);  
        }
      }
    }
    return cachedBounds;
  }

  protected boolean impl_computeIntersects(PickRay pickRay, PickResultChooser pickResult,
                                           javafx.scene.Node candidate, CullFace cullFace, 
                                           boolean reportFace) {

    boolean found = false;

    final Vector o = pickRay.getOriginNoClone();
    final Vector d = pickRay.getDirectionNoClone();

    for (Polygon face : faces) {
      for (Vector[] triangle : face.getTriangles()) {
        if (computeIntersectsFace(pickRay, o, d, triangle, cullFace, candidate,
                reportFace, pickResult)) {
          found = true;
        }
      }
    }
    return found;
  }

  private Point3D computeCentroid(
          double v0x, double v0y, double v0z,
          double v1x, double v1y, double v1z,
          double v2x, double v2y, double v2z) {

//        Point3D center = v1.midpoint(v2);
//        Point3D vec = center.subtract(v0);
//        return v0.add(new Point3D(vec.getX() / 3.0, vec.getY() / 3.0, vec.getZ() / 3.0));

    return new Point3D(
            v0x + (v2x + (v1x - v2x) / 2.0 - v0x) / 3.0,
            v0y + (v2y + (v1y - v2y) / 2.0 - v0y) / 3.0,
            v0z + (v2z + (v1z - v2z) / 2.0 - v0z) / 3.0);
  }
  
  private boolean computeIntersectsFace(
          PickRay pickRay, Vector origin, Vector dir, Vector[] face,
          CullFace cullFace, javafx.scene.Node candidate, boolean reportFace, 
          PickResultChooser result) {//, BoxBounds rayBounds) {

    final float v0x = (float) face[0].x;
    final float v0y = (float) face[0].y;
    final float v0z = (float) face[0].z;
    final float v1x = (float) face[1].x;
    final float v1y = (float) face[1].y;
    final float v1z = (float) face[1].z;
    final float v2x = (float) face[2].x;
    final float v2y = (float) face[2].y;
    final float v2z = (float) face[2].z;

    // e1 = v1.subtract(v0)
    final float e1x = v1x - v0x;
    final float e1y = v1y - v0y;
    final float e1z = v1z - v0z;
    // e2 = v2.subtract(v0)
    final float e2x = v2x - v0x;
    final float e2y = v2y - v0y;
    final float e2z = v2z - v0z;

    // h = dir.crossProduct(e2)
    final double hx = dir.y * e2z - dir.z * e2y;
    final double hy = dir.z * e2x - dir.x * e2z;
    final double hz = dir.x * e2y - dir.y * e2x;

    // a = e1.dotProduct(h)
    final double a = e1x * hx + e1y * hy + e1z * hz;
    if (a == 0.0) {
      return false;
    }
    final double f = 1.0 / a;

    // s = origin.subtract(v0)
    final double sx = origin.x - v0x;
    final double sy = origin.y - v0y;
    final double sz = origin.z - v0z;

    // u = f * (s.dotProduct(h))
    final double u = f * (sx * hx + sy * hy + sz * hz);

    if (u < 0.0 || u > 1.0) {
      return false;
    }

    // q = s.crossProduct(e1)
    final double qx = sy * e1z - sz * e1y;
    final double qy = sz * e1x - sx * e1z;
    final double qz = sx * e1y - sy * e1x;

    // v = f * dir.dotProduct(q)
    double v = f * (dir.x * qx + dir.y * qy + dir.z * qz);

    if (v < 0.0 || u + v > 1.0) {
      return false;
    }

    // t = f * e2.dotProduct(q)
    final double t = f * (e2x * qx + e2y * qy + e2z * qz);

    if (t >= pickRay.getNearClip() && t <= pickRay.getFarClip()) {
      // This branch is entered only for hit triangles (not so often),
      // so we can get smoothly back to the nice code using Point3Ds.

      if (cullFace != CullFace.NONE) {
        // normal = e1.crossProduct(e2)
        final Point3D normal = new Point3D(
                e1y * e2z - e1z * e2y,
                e1z * e2x - e1x * e2z,
                e1x * e2y - e1y * e2x);

        final double nangle = normal.angle(
                new Point3D(-dir.x, -dir.y, -dir.z));
        if ((nangle >= 90 || cullFace != CullFace.BACK) &&
                (nangle <= 90 || cullFace != CullFace.FRONT)) {
          // hit culled face
          return false;
        }
      }

      if (Double.isInfinite(t) || Double.isNaN(t)) {
        // we've got a nonsense pick ray or triangle
        return false;
      }

      if (result == null || !result.isCloser(t)) {
        // it intersects, but we are not interested in the result
        // or we already have a better (closer) result
        // so we can omit the point and texture computation
        return true;
      }

//      Point3D point = PickResultChooser.computePoint(pickRay, t);
      
//      result.offer(candidate, t,
//              reportFace ? faceIndex / vertexFormat.getFaceElementSize() : PickResult.FACE_UNDEFINED,
//              point, txCoords);
      return true;
    }

    return false;
  }


}
