package cad.gcs;

import cad.gcs.constr.Equals;

import java.util.ArrayList;
import java.util.List;

public class Figures {

  public static final int X1 = 0;
  public static final int Y1 = 1;
  public static final int X2 = 2;
  public static final int Y2 = 3;
  public static final int X3 = 4;
  public static final int Y3 = 5;
  public static final int X4 = 6;
  public static final int Y4 = 7;

  public static Figure square(double size) {

    List<Constraint> constrs = new ArrayList<>();

    Param[] l1 = line();
    Param[] l2 = line();
    Param[] l3 = line();
    Param[] l4 = line();

    constrs.add(new Equals(l1[X1], l4[X2]));
    constrs.add(new Equals(l1[Y1], l4[Y2]));
    constrs.add(new Equals(l2[X1], l1[X2]));
    constrs.add(new Equals(l2[Y1], l1[Y2]));
    constrs.add(new Equals(l3[X1], l2[X2]));
    constrs.add(new Equals(l3[Y1], l2[Y2]));
    constrs.add(new Equals(l4[X1], l4[X2]));
    constrs.add(new Equals(l4[Y1], l4[Y2]));
    constrs.add(new Equals(l1[Y1], l1[Y2]));
    constrs.add(new Equals(l3[Y1], l1[Y2]));
    constrs.add(new Equals(l2[X1], l1[X2]));
    constrs.add(new Equals(l4[X1], l1[X2]));

    return new Figure(new Param[][]{l1, l2, l3, l4}, constrs);
  }

  private static Param[] line() {
    return new Param[]{new Param(10), new Param(10), new Param(100), new Param(100)};
  }

  public static class Figure {

    public final Param[][] lines;
    public final List<Constraint> constraints;

    public Figure(Param[][] lines, List<Constraint> constraints) {
      this.lines = lines;
      this.constraints = constraints;
    }
  }
}
