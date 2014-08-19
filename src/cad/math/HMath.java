package cad.math;

import javafx.geometry.Point3D;
import javafx.scene.transform.Affine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static java.lang.Math.*;

public class HMath {

  public static final int X = 0;
  public static final int Y = 1;
  public static final int Z = 2;
  public static final double[] EMPTY = new double[0];
  public static final Vector X_AXIS = new Vector(1, 0, 0);
  public static final Vector Y_AXIS = new Vector(0, 1, 0);
  public static final Vector Z_AXIS = new Vector(0, 0, 1);
  public static final Vector ZERO = new Vector(0, 0, 0);

  public static final double TOLERANCE = 0.000001;

  /**
   * x*p1 + x*p2 + p3 = 0
   * x*m1 + x*m2 + m3 = 0
   *
   * @return
   */
  public static double[] solveLinearSystem(double p1, double p2, double p3,
                                           double m1, double m2, double m3) {

    double y = (m1 * m3 * p1 + m1 * p3) / (m1 * p2 - m1 * m2 * p1);
    double x = (-y * p2 - p3) / p1;
    return new double[]{x, y};
  }

  /**
   * ax^2 + bx + c = 0
   *
   * @return
   */
  public static final double[] solveQuadraticEquation(double a, double b, double c) {
    final double D = b*b - 4 * a * c;
    double[] solutions;
    if (D > 0) {
      solutions = new double[2];
      solutions[0] = (-b + sqrt(D)) / (2 * a);
      solutions[1] = (-b - sqrt(D)) / (2 * a);

    } else if (D == 0) {
      solutions = new double[2];
      solutions[0] = -b / (2 * a);
    } else {
      solutions = EMPTY;
    }
    return solutions;
  }

  public static double length(double[] vector) {
    double sum = 0;
    for (double v : vector) {
      sum += v * v;
    }
    return Math.sqrt(sum);
  }

  public static double[] ortoXY(double[] vector) {
    return new double[]{-vector[Y], vector[X]};
  }

  public static double[] plus(double[] vector1, double[] vector2) {
    double[] result = new double[max(vector1.length, vector2.length)];
    for (int i = 0; i < min(vector1.length, vector2.length); i++) {
      result[i] = vector1[i] + vector2[i];
    }
    return result;
  }

  public static double[] minus(double[] fromVector, double[] vector) {
    double[] result = new double[max(fromVector.length, vector.length)];
    for (int i = 0; i < min(fromVector.length, vector.length); i++) {
      result[i] = fromVector[i] - vector[i];
    }
    return result;
  }

  public static double[] scale(double[] vector, double factor) {
    double[] scaled = new double[vector.length];
    for (int i = 0; i < vector.length; i++) {
      scaled[i] = vector[i] * factor;
    }
    return scaled;
  }

  public static double[] scale(double[] vector1, double[] vector2) {
    double[] result = new double[max(vector1.length, vector2.length)];
    for (int i = 0; i < min(vector1.length, vector2.length); i++) {
      result[i] = vector1[i] * vector2[i];
    }
    return result;
  }

  public static double[] norma(double[] vector) {
    double length = length(vector);
    double[] norma = new double[vector.length];
    for (int i = 0; i < vector.length; i++) {
      norma[i] = vector[i] / length;
    }
    return norma;
  }

  public static double[] getOutOfCS2D(double[] point, double[] abscissa) {
    double[] ex = norma(abscissa);
    double[] ey = ortoXY(ex);

    double[] xpart = scale(ex, point[X]);
    double[] ypart = scale(ey, point[Y]);

    return plus(xpart, ypart);
  }

  public static List<double[]> circleIntsc(double[] center1, double[] center2, double r1, double r2) {
    double[] abscissa = minus(center2, center1);
    double l = length(abscissa);
    double x = (l * l - r2 * r2 + r1 * r1) / (2 * l);
    double D = r1 * r1 - x * x;
    if (D > 0) {
      List<double[]> solutions = new ArrayList<>(2);
      solutions.add(plus(center1, getOutOfCS2D(vector(x, + Math.sqrt(D)), abscissa)));
      solutions.add(plus(center1, getOutOfCS2D(vector(x, - Math.sqrt(D)), abscissa)));
      return solutions;
    } else {
      return Collections.emptyList();
    }
  }

  @Deprecated
  public static Vector transform(Vector vector, Matrix transform) {
    return cross(transform, vector);
  }

  public static Vector cross(Matrix transform, Vector vector) {
    double x = vector.x;
    double y = vector.y;
    double z = vector.z;
    return new Vector(
            transform.mxx * x + transform.mxy * y + transform.mxz * z + transform.tx,
            transform.myx * x + transform.myy * y + transform.myz * z + transform.ty,
            transform.mzx * x + transform.mzy * y + transform.mzz * z + transform.tz);
  }


  public static Matrix translateMatrix(Vector translation) {
    Matrix matrix = new Matrix();
    matrix.tx = translation.x;
    matrix.ty = translation.y;
    matrix.tz = translation.z;
    return matrix;
  }

  public static Matrix rotateMatrix(double angle, Vector axis, Vector pivot) {
    final double sin = Math.sin(angle);
    final double cos = Math.cos(angle);
    double axisX, axisY, axisZ;
    Matrix m = new Matrix();

    if (axis == X_AXIS || axis == Y_AXIS || axis == Z_AXIS) {
      axisX = axis.x;
      axisY = axis.y;
      axisZ = axis.z;
    } else {
      // normalize
      final double mag = axis.length();

      if (mag == 0.0) {
        return m;
      } else {
        axisX = axis.x / mag;
        axisY = axis.y / mag;
        axisZ = axis.z / mag;
      }
    }

    double px = pivot.x;
    double py = pivot.y;
    double pz = pivot.z;

    m.mxx = cos + axisX * axisX * (1 - cos);
    m.mxy = axisX * axisY * (1 - cos) - axisZ * sin;
    m.mxz = axisX * axisZ * (1 - cos) + axisY * sin;

    m.tx = px * (1 - m.mxx) - py * m.mxy - pz * m.mxz;

    m.myx = axisY * axisX * (1 - cos) + axisZ * sin;
    m.myy = cos + axisY * axisY * (1 - cos);
    m.myz = axisY * axisZ * (1 - cos) - axisX * sin;
    m.ty = py * (1 - m.myy) - px * m.myx - pz * m.myz;

    m.mzx = axisZ * axisX * (1 - cos) - axisY * sin;
    m.mzy = axisZ * axisY * (1 - cos) + axisX * sin;
    m.mzz = cos + axisZ * axisZ * (1 - cos);
    m.tz = pz * (1 - m.mzz) - px * m.mzx - py * m.mzy;
    return m;
  }

  public static Matrix scaleMatrix(Vector scale, Vector pivot) {
    double sx = scale.x;
    double sy = scale.y;
    double sz = scale.z;
    return new Matrix(
            sx, 0, 0, (1 - sx) * pivot.x,
            0, sy, 0, (1 - sy) * pivot.y,
            0, 0, sz, (1 - sz) * pivot.z);
  }
  
  public static Matrix combine(Matrix... matrices) {
    if (matrices.length == 0) {
      return new Matrix();
    }
    if (matrices.length == 1) {
      return matrices[0];
    }
    Matrix m = matrices[0];

    for (int i = 1; i < matrices.length; i++) {
      m = m.combine(matrices[i]);
    }
    return m;
  }

  public static double[] vector(double... data) {
    return data;
  }

  public static Vector[] translate(Vector[] vectors, Vector delta) {
    vectors = copy(vectors);
    for (int i = 0; i < vectors.length; i++) {
      vectors[i].x += delta.x;
      vectors[i].y += delta.y;
      vectors[i].z += delta.z;
    }
    return vectors;
  }

  public static Vector[] copy(Vector[] vectors) {
    Vector[] copy = new Vector[vectors.length];
    for (int i = 0; i < vectors.length; i++) {
      copy[i] = vectors[i].copy();
    }
    return copy;
  }

  public static boolean areEqual(double v1, double v2, double tolerance) {
    return abs(v1 - v2) < tolerance;
  }
}
