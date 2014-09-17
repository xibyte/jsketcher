package cad.freegcs;


public class GEOM {

  static public class Point {
    public Point() {
      x = 0;
      y = 0;
    }

    public double x;
    public double y;
  }

  static public class Line {
    public Line() {
    }

    public Point p1;
    public Point p2;
  }

  static public class Arc {
    public Arc() {
      startAngle = 0;
      endAngle = 0;
      rad = 0;
    }

    public double startAngle;
    public double endAngle;
    public double rad;
    public Point start;
    public Point end;
    public Point center;
  }

  static public class Circle {

    public Circle() {
      rad = 0;
    }

    public Point center;
    public double rad;
  }
} //namespace GCS