package cad.gcs;

import cad.gcs.constr.Equal;
import cad.gcs.constr.P2LDistance;

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

    constrs.add(new Equal(l1[X1], l4[X2]));
    constrs.add(new Equal(l1[Y1], l4[Y2]));
    constrs.add(new Equal(l2[X1], l1[X2]));
    constrs.add(new Equal(l2[Y1], l1[Y2]));
    constrs.add(new Equal(l3[X1], l2[X2]));
    constrs.add(new Equal(l3[Y1], l2[Y2]));
    constrs.add(new Equal(l4[X1], l3[X2]));
    constrs.add(new Equal(l4[Y1], l3[Y2]));

    constrs.add(new Equal(l1[Y1], l1[Y2]));
    constrs.add(new Equal(l3[Y1], l3[Y2]));
    constrs.add(new Equal(l2[X1], l2[X2]));
    constrs.add(new Equal(l4[X1], l4[X2]));

    constrs.add(new P2LDistance(100, l1[X1], l1[Y1], l2[X1], l2[Y1], l2[X2], l2[Y2]));
    constrs.add(new P2LDistance(100, l1[X1], l1[Y1], l3[X1], l3[Y1], l3[X2], l3[Y2]));

    return new Figure(new Param[][]{l1, l2, l3, l4}, constrs);
  }

  private static Param[] line() {
    return new Param[]{new Param(200), new Param(200), new Param(500), new Param(500)};
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
