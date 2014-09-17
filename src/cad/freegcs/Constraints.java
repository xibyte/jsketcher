package cad.freegcs;

import gnu.trove.list.TDoubleList;
import gnu.trove.list.array.TDoubleArrayList;
import gnu.trove.map.hash.TDoubleObjectHashMap;

import static cad.freegcs.GEOM.*;

/***************************************************************************
 *   Copyright (c) Konstantinos Poulios      (logari81@gmail.com) 2011     *
 *                                                                         *
 *   This file is part of the FreeCAD CAx development system.              *
 *                                                                         *
 *   This library is free software; you can redistribute it and/or         *
 *   modify it under the terms of the GNU Library General Public           *
 *   License as published by the Free Software Foundation; either          *
 *   version 2 of the License, or (at your option) any later version.      *
 *                                                                         *
 *   This library  is distributed in the hope that it will be useful,      *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU Library General Public License for more details.                  *
 *                                                                         *
 *   You should have received a copy of the GNU Library General Public     *
 *   License along with this library; see the file COPYING.LIB. If not,    *
 *   write to the Free Software Foundation, Inc., 59 Temple Place,         *
 *   Suite 330, Boston, MA  02111-1307, USA                                *
 *                                                                         *
 ***************************************************************************/



///////////////////////////////////////
public class  Constraints {
///////////////////////////////////////
  public enum ConstraintType {
    Equal,
    None,
    Difference,
    P2PDistance,
    P2PAngle,
    P2LDistance,
    PointOnLine,
    PointOnPerpBisector,
    Parallel,
    Perpendicular,
    L2LAngle,
    MidpointOnLine,
    TangentCircumf
  }

  abstract static public class Constraint implements Cloneable {

    public final TDoubleArrayList pvec = new TDoubleArrayList();
    public final TDoubleArrayList origpvec = new TDoubleArrayList();
    public double scale = 1.0;
    public int tag = 0;

    public void redirectParams(TDoubleObjectHashMap<Double> redirectionmap) {
      for (int i = 0; i < origpvec.size(); i++) {
        double param = origpvec.get(i);
        Double v = redirectionmap.get(param);
        if (v != null) {
          pvec.set(i, v);
        }
      }
    }

    public TDoubleArrayList params() { return pvec; }


    public void revertParams() {
      assign(pvec, origpvec);
    }

    protected void assign(TDoubleList a, TDoubleList b) {
      a.clear();
      a.addAll(b);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.None;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      return 0.;
    }

    public double grad(double param) {
      return 0.;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir, double lim) {
      return lim;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir) {
      return maxStep(dir, 1.);
    }

    public void rescale() {
      rescale(1.);
    }

    public void setTag(int tagId) {
      tag = tagId;
    }

    public int getTag() {
      return tag;
    }

    public Constraint copy() {
      try {
        return (Constraint) clone();
      } catch (CloneNotSupportedException e) {
        throw new UnsupportedOperationException(e);
      }
    }
  }

  // Equal
  static public class ConstraintEqual extends Constraint {

    ConstraintEqual(double p1, double p2) {
      pvec.add(p1);
      pvec.add(p2);
      assign(origpvec, pvec);
      rescale();
    }

    double param1() {
      return pvec.get(0);
    }

    double param2() {
      return pvec.get(1);
    }


    public ConstraintType getTypeId() {
      return ConstraintType.Equal;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      return scale * (param1() - param2());
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == param1()) deriv += 1;
      if (param == param2()) deriv += -1;
      return scale * deriv;
    }
  } // EQUAL


  // Difference
  static public class ConstraintDifference extends Constraint {

    ConstraintDifference(double p1, double p2, double d) {
      pvec.add(p1);
      pvec.add(p2);
      pvec.add(d);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintType getTypeId() {
      return ConstraintType.Difference;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      return scale * (param2() - param1() - difference());
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == param1()) deriv += -1;
      if (param == param2()) deriv += 1;
      if (param == difference()) deriv += -1;
      return scale * deriv;
    }

    double param1() {
      return pvec.get(0);
    }

    double param2() {
      return pvec.get(1);
    }

    double difference() {
      return pvec.get(2);
    }
  }

  // P2PDistance
  static public class ConstraintP2PDistance extends Constraint {

    public ConstraintP2PDistance(Point p1, Point p2, double d) {
      pvec.add(p1.x);
      pvec.add(p1.y);
      pvec.add(p2.x);
      pvec.add(p2.y);
      pvec.add(d);
      assign(origpvec, pvec);
      rescale();
    }

    double p1x() {
      return pvec.get(0);
    }

    double p1y() {
      return pvec.get(1);
    }

    double p2x() {
      return pvec.get(2);
    }

    double p2y() {
      return pvec.get(3);
    }

    double distance() {
      return pvec.get(4);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.P2PDistance;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      double dx = (p1x() - p2x());
      double dy = (p1y() - p2y());
      double d = Math.sqrt(dx * dx + dy * dy);
      double dist = distance();
      return scale * (d - dist);
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == p1x() || param == p1y() ||
              param == p2x() || param == p2y()) {
        double dx = (p1x() - p2x());
        double dy = (p1y() - p2y());
        double d = Math.sqrt(dx * dx + dy * dy);
        if (param == p1x()) deriv += dx / d;
        if (param == p1y()) deriv += dy / d;
        if (param == p2x()) deriv += -dx / d;
        if (param == p2y()) deriv += -dy / d;
      }
      if (param == distance()) deriv += -1.;

      return scale * deriv;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir, double lim) {
      // distance() >= 0
      Double it = dir.get(distance());
      if (it != null && it < 0.) {
        lim = Math.min(lim, -(distance()) / it);
      }
      // restrict actual distance change
      double ddx = 0., ddy = 0.;
      it = dir.get(p1x());
      if (it != null) ddx += it;
      it = dir.get(p1y());
      if (it != null) ddy += it;
      it = dir.get(p2x());
      if (it != null) ddx -= it;
      it = dir.get(p2y());
      if (it != null) ddy -= it;
      double dd = Math.sqrt(ddx * ddx + ddy * ddy);
      double dist = distance();
      if (dd > dist) {
        double dx = (p1x() - p2x());
        double dy = (p1y() - p2y());
        double d = Math.sqrt(dx * dx + dy * dy);
        if (dd > d)
          lim = Math.min(lim, Math.max(d, dist) / dd);
      }
      return lim;
    }
  }

  // P2PAngle
  static public class ConstraintP2PAngle extends Constraint {

    public double da;

    public ConstraintP2PAngle(Point p1, Point p2, double a) {
      this(p1, p2, a, 0);
    }

    public ConstraintP2PAngle(Point p1, Point p2, double a, double da) {
      this.da = da;
      pvec.add(p1.x);
      pvec.add(p1.y);
      pvec.add(p2.x);
      pvec.add(p2.y);
      pvec.add(a);
      assign(origpvec, pvec);
      rescale();
    }

    double p1x() {
      return pvec.get(0);
    }

    double p1y() {
      return pvec.get(1);
    }

    double p2x() {
      return pvec.get(2);
    }

    double p2y() {
      return pvec.get(3);
    }

    double angle() {
      return pvec.get(4);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.P2PAngle;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      double dx = (p2x() - p1x());
      double dy = (p2y() - p1y());
      double a = angle() + da;
      double ca = Math.cos(a);
      double sa = Math.sin(a);
      double x = dx * ca + dy * sa;
      double y = -dx * sa + dy * ca;
      return scale * Math.atan2(y, x);
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == p1x() || param == p1y() ||
              param == p2x() || param == p2y()) {
        double dx = (p2x() - p1x());
        double dy = (p2y() - p1y());
        double a = angle() + da;
        double ca = Math.cos(a);
        double sa = Math.sin(a);
        double x = dx * ca + dy * sa;
        double y = -dx * sa + dy * ca;
        double r2 = dx * dx + dy * dy;
        dx = -y / r2;
        dy = x / r2;
        if (param == p1x()) deriv += (-ca * dx + sa * dy);
        if (param == p1y()) deriv += (-sa * dx - ca * dy);
        if (param == p2x()) deriv += (ca * dx - sa * dy);
        if (param == p2y()) deriv += (sa * dx + ca * dy);
      }
      if (param == angle()) deriv += -1;

      return scale * deriv;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir, double lim) {
      // step(angle()) <= pi/18 = 10°
      Double it = dir.get(angle());
      if (it != null) {
        double step = Math.abs(it);
        if (step > Math.PI / 18.)
          lim = Math.min(lim, (Math.PI / 18.) / step);
      }
      return lim;
    }
  }

  // P2LDistance
  static public class ConstraintP2LDistance extends Constraint {

    ConstraintP2LDistance(Point p, Line l, double d) {
      pvec.add(p.x);
      pvec.add(p.y);
      pvec.add(l.p1.x);
      pvec.add(l.p1.y);
      pvec.add(l.p2.x);
      pvec.add(l.p2.y);
      pvec.add(d);
      assign(origpvec, pvec);
      rescale();
    }

    double p0x() {
      return pvec.get(0);
    }

    double p0y() {
      return pvec.get(1);
    }

    double p1x() {
      return pvec.get(2);
    }

    double p1y() {
      return pvec.get(3);
    }

    double p2x() {
      return pvec.get(4);
    }

    double p2y() {
      return pvec.get(5);
    }

    double distance() {
      return pvec.get(6);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.P2LDistance;
    }

    public void rescale(double coef) {
      scale = coef;
    }

    public double error() {
      double x0 = p0x(), x1 = p1x(), x2 = p2x();
      double y0 = p0y(), y1 = p1y(), y2 = p2y();
      double dist = distance();
      double dx = x2 - x1;
      double dy = y2 - y1;
      double d = Math.sqrt(dx * dx + dy * dy);
      double area = Math.abs
              (-x0 * dy + y0 * dx + x1 * y2 - x2 * y1); // = x1y2 - x2y1 - x0y2 + x2y0 + x0y1 - x1y0 = 2*(triangle area)
      return scale * (area / d - dist);
    }

    public double grad(double param) {
      double deriv = 0.;
      // darea/dx0 = (y1-y2)      darea/dy0 = (x2-x1)
      // darea/dx1 = (y2-y0)      darea/dy1 = (x0-x2)
      // darea/dx2 = (y0-y1)      darea/dy2 = (x1-x0)
      if (param == p0x() || param == p0y() ||
              param == p1x() || param == p1y() ||
              param == p2x() || param == p2y()) {
        double x0 = p0x(), x1 = p1x(), x2 = p2x();
        double y0 = p0y(), y1 = p1y(), y2 = p2y();
        double dx = x2 - x1;
        double dy = y2 - y1;
        double d2 = dx * dx + dy * dy;
        double d = Math.sqrt(d2);
        double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
        if (param == p0x()) deriv += (y1 - y2) / d;
        if (param == p0y()) deriv += (x2 - x1) / d;
        if (param == p1x()) deriv += ((y2 - y0) * d + (dx / d) * area) / d2;
        if (param == p1y()) deriv += ((x0 - x2) * d + (dy / d) * area) / d2;
        if (param == p2x()) deriv += ((y0 - y1) * d - (dx / d) * area) / d2;
        if (param == p2y()) deriv += ((x1 - x0) * d - (dy / d) * area) / d2;
        if (area < 0)
          deriv *= -1;
      }
      if (param == distance()) deriv += -1;

      return scale * deriv;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir, double lim) {

      // distance() >= 0
      Double it = dir.get(distance());
      if (it != null && it < 0.) {
        lim = Math.min(lim, -(distance()) / it);
      }
      // restrict actual area change
      double darea = 0.;
      double x0 = p0x(), x1 = p1x(), x2 = p2x();
      double y0 = p0y(), y1 = p1y(), y2 = p2y();
      it = dir.get(p0x());
      if (it != null) darea += (y1 - y2) * it;
      it = dir.get(p0y());
      if (it != null) darea += (x2 - x1) * it;
      it = dir.get(p1x());
      if (it != null) darea += (y2 - y0) * it;
      it = dir.get(p1y());
      if (it != null) darea += (x0 - x2) * it;
      it = dir.get(p2x());
      if (it != null) darea += (y0 - y1) * it;
      it = dir.get(p2y());
      if (it != null) darea += (x1 - x0) * it;

      darea = Math.abs(darea);
      if (darea > 0.) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        double area = 0.3 * (distance()) * Math.sqrt(dx * dx + dy * dy);
        if (darea > area) {
          area = Math.max(area, 0.3 * Math.abs(-x0 * dy + y0 * dx + x1 * y2 - x2 * y1));
          if (darea > area)
            lim = Math.min(lim, area / darea);
        }
      }
      return lim;
    }
  }

  // PointOnLine
  static public class ConstraintPointOnLine extends Constraint {

    public ConstraintPointOnLine(Point p, Line l) {
      pvec.add(p.x);
      pvec.add(p.y);
      pvec.add(l.p1.x);
      pvec.add(l.p1.y);
      pvec.add(l.p2.x);
      pvec.add(l.p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintPointOnLine(Point p, Point lp1, Point lp2) {
      pvec.add(p.x);
      pvec.add(p.y);
      pvec.add(lp1.x);
      pvec.add(lp1.y);
      pvec.add(lp2.x);
      pvec.add(lp2.y);
      assign(origpvec, pvec);
      rescale();
    }

    double p0x() {
      return pvec.get(0);
    }

    double p0y() {
      return pvec.get(1);
    }

    double p1x() {
      return pvec.get(2);
    }

    double p1y() {
      return pvec.get(3);
    }

    double p2x() {
      return pvec.get(4);
    }

    double p2y() {
      return pvec.get(5);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.PointOnLine;
    }

    public void rescale(double coef) {
      scale = coef;
    }

    public double error() {
      double x0 = p0x(), x1 = p1x(), x2 = p2x();
      double y0 = p0y(), y1 = p1y(), y2 = p2y();
      double dx = x2 - x1;
      double dy = y2 - y1;
      double d = Math.sqrt(dx * dx + dy * dy);
      double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1; // = x1y2 - x2y1 - x0y2 + x2y0 + x0y1 - x1y0 = 2*(triangle area)
      return scale * area / d;
    }

    public double grad(double param) {
      double deriv = 0.;
      // darea/dx0 = (y1-y2)      darea/dy0 = (x2-x1)
      // darea/dx1 = (y2-y0)      darea/dy1 = (x0-x2)
      // darea/dx2 = (y0-y1)      darea/dy2 = (x1-x0)
      if (param == p0x() || param == p0y() ||
              param == p1x() || param == p1y() ||
              param == p2x() || param == p2y()) {
        double x0 = p0x(), x1 = p1x(), x2 = p2x();
        double y0 = p0y(), y1 = p1y(), y2 = p2y();
        double dx = x2 - x1;
        double dy = y2 - y1;
        double d2 = dx * dx + dy * dy;
        double d = Math.sqrt(d2);
        double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
        if (param == p0x()) deriv += (y1 - y2) / d;
        if (param == p0y()) deriv += (x2 - x1) / d;
        if (param == p1x()) deriv += ((y2 - y0) * d + (dx / d) * area) / d2;
        if (param == p1y()) deriv += ((x0 - x2) * d + (dy / d) * area) / d2;
        if (param == p2x()) deriv += ((y0 - y1) * d - (dx / d) * area) / d2;
        if (param == p2y()) deriv += ((x1 - x0) * d - (dy / d) * area) / d2;
      }
      return scale * deriv;
    }
  }

  // PointOnPerpBisector
  static public class ConstraintPointOnPerpBisector extends Constraint {

    public ConstraintPointOnPerpBisector(Point p, Line l) {
      pvec.add(p.x);
      pvec.add(p.y);
      pvec.add(l.p1.x);
      pvec.add(l.p1.y);
      pvec.add(l.p2.x);
      pvec.add(l.p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintPointOnPerpBisector(Point p, Point lp1, Point lp2) {
      pvec.add(p.x);
      pvec.add(p.y);
      pvec.add(lp1.x);
      pvec.add(lp1.y);
      pvec.add(lp2.x);
      pvec.add(lp2.y);
      assign(origpvec, pvec);
      rescale();
    }

    double p0x() {
      return pvec.get(0);
    }

    double p0y() {
      return pvec.get(1);
    }

    double p1x() {
      return pvec.get(2);
    }

    double p1y() {
      return pvec.get(3);
    }

    double p2x() {
      return pvec.get(4);
    }

    double p2y() {
      return pvec.get(5);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.PointOnPerpBisector;
    }

    public void rescale(double coef) {
      scale = coef;
    }


    public double error() {
      double dx1 = p1x() - p0x();
      double dy1 = p1y() - p0y();
      double dx2 = p2x() - p0x();
      double dy2 = p2y() - p0y();
      return scale * (Math.sqrt(dx1 * dx1 + dy1 * dy1) - Math.sqrt(dx2 * dx2 + dy2 * dy2));
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == p0x() || param == p0y() ||
              param == p1x() || param == p1y()) {
        double dx1 = p1x() - p0x();
        double dy1 = p1y() - p0y();
        if (param == p0x()) deriv -= dx1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
        if (param == p0y()) deriv -= dy1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
        if (param == p1x()) deriv += dx1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
        if (param == p1y()) deriv += dy1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
      }
      if (param == p0x() || param == p0y() ||
              param == p2x() || param == p2y()) {
        double dx2 = p2x() - p0x();
        double dy2 = p2y() - p0y();
        if (param == p0x()) deriv += dx2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (param == p0y()) deriv += dy2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (param == p2x()) deriv -= dx2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (param == p2y()) deriv -= dy2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
      }
      return scale * deriv;
    }
  }

  // Parallel
  static public class ConstraintParallel extends Constraint {

    public ConstraintParallel(Line l1, Line l2) {
      pvec.add(l1.p1.x);
      pvec.add(l1.p1.y);
      pvec.add(l1.p2.x);
      pvec.add(l1.p2.y);
      pvec.add(l2.p1.x);
      pvec.add(l2.p1.y);
      pvec.add(l2.p2.x);
      pvec.add(l2.p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    double l1p1x() {
      return pvec.get(0);
    }

    double l1p1y() {
      return pvec.get(1);
    }

    double l1p2x() {
      return pvec.get(2);
    }

    double l1p2y() {
      return pvec.get(3);
    }

    double l2p1x() {
      return pvec.get(4);
    }

    double l2p1y() {
      return pvec.get(5);
    }

    double l2p2x() {
      return pvec.get(6);
    }

    double l2p2y() {
      return pvec.get(7);
    }


    public ConstraintType getTypeId() {
      return ConstraintType.Parallel;
    }

    public void rescale(double coef) {
      double dx1 = (l1p1x() - l1p2x());
      double dy1 = (l1p1y() - l1p2y());
      double dx2 = (l2p1x() - l2p2x());
      double dy2 = (l2p1y() - l2p2y());
      scale = coef / Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2));
    }

    public double error() {
      double dx1 = (l1p1x() - l1p2x());
      double dy1 = (l1p1y() - l1p2y());
      double dx2 = (l2p1x() - l2p2x());
      double dy2 = (l2p1y() - l2p2y());
      return scale * (dx1 * dy2 - dy1 * dx2);
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == l1p1x()) deriv += (l2p1y() - l2p2y()); // = dy2
      if (param == l1p2x()) deriv += -(l2p1y() - l2p2y()); // = -dy2
      if (param == l1p1y()) deriv += -(l2p1x() - l2p2x()); // = -dx2
      if (param == l1p2y()) deriv += (l2p1x() - l2p2x()); // = dx2

      if (param == l2p1x()) deriv += -(l1p1y() - l1p2y()); // = -dy1
      if (param == l2p2x()) deriv += (l1p1y() - l1p2y()); // = dy1
      if (param == l2p1y()) deriv += (l1p1x() - l1p2x()); // = dx1
      if (param == l2p2y()) deriv += -(l1p1x() - l1p2x()); // = -dx1

      return scale * deriv;
    }
  }

  // Perpendicular
  static public class ConstraintPerpendicular extends Constraint {

    public ConstraintPerpendicular(Line l1, Line l2) {
      pvec.add(l1.p1.x);
      pvec.add(l1.p1.y);
      pvec.add(l1.p2.x);
      pvec.add(l1.p2.y);
      pvec.add(l2.p1.x);
      pvec.add(l2.p1.y);
      pvec.add(l2.p2.x);
      pvec.add(l2.p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintPerpendicular(Point l1p1, Point l1p2,
                                   Point l2p1, Point l2p2) {
      pvec.add(l1p1.x);
      pvec.add(l1p1.y);
      pvec.add(l1p2.x);
      pvec.add(l1p2.y);
      pvec.add(l2p1.x);
      pvec.add(l2p1.y);
      pvec.add(l2p2.x);
      pvec.add(l2p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    double l1p1x() {
      return pvec.get(0);
    }

    double l1p1y() {
      return pvec.get(1);
    }

    double l1p2x() {
      return pvec.get(2);
    }

    double l1p2y() {
      return pvec.get(3);
    }

    double l2p1x() {
      return pvec.get(4);
    }

    double l2p1y() {
      return pvec.get(5);
    }

    double l2p2x() {
      return pvec.get(6);
    }

    double l2p2y() {
      return pvec.get(7);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.Perpendicular;
    }

    public void rescale(double coef) {
      double dx1 = (l1p1x() - l1p2x());
      double dy1 = (l1p1y() - l1p2y());
      double dx2 = (l2p1x() - l2p2x());
      double dy2 = (l2p1y() - l2p2y());
      scale = coef / Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2));
    }

    public double error() {
      double dx1 = (l1p1x() - l1p2x());
      double dy1 = (l1p1y() - l1p2y());
      double dx2 = (l2p1x() - l2p2x());
      double dy2 = (l2p1y() - l2p2y());
      return scale * (dx1 * dx2 + dy1 * dy2);
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == l1p1x()) deriv += (l2p1x() - l2p2x()); // = dx2
      if (param == l1p2x()) deriv += -(l2p1x() - l2p2x()); // = -dx2
      if (param == l1p1y()) deriv += (l2p1y() - l2p2y()); // = dy2
      if (param == l1p2y()) deriv += -(l2p1y() - l2p2y()); // = -dy2

      if (param == l2p1x()) deriv += (l1p1x() - l1p2x()); // = dx1
      if (param == l2p2x()) deriv += -(l1p1x() - l1p2x()); // = -dx1
      if (param == l2p1y()) deriv += (l1p1y() - l1p2y()); // = dy1
      if (param == l2p2y()) deriv += -(l1p1y() - l1p2y()); // = -dy1

      return scale * deriv;
    }
  }

  // L2LAngle
  static public class ConstraintL2LAngle extends Constraint {

    public ConstraintL2LAngle(Line l1, Line l2, double a) {
      pvec.add(l1.p1.x);
      pvec.add(l1.p1.y);
      pvec.add(l1.p2.x);
      pvec.add(l1.p2.y);
      pvec.add(l2.p1.x);
      pvec.add(l2.p1.y);
      pvec.add(l2.p2.x);
      pvec.add(l2.p2.y);
      pvec.add(a);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintL2LAngle(Point l1p1, Point l1p2,
                              Point l2p1, Point l2p2, double a) {
      pvec.add(l1p1.x);
      pvec.add(l1p1.y);
      pvec.add(l1p2.x);
      pvec.add(l1p2.y);
      pvec.add(l2p1.x);
      pvec.add(l2p1.y);
      pvec.add(l2p2.x);
      pvec.add(l2p2.y);
      pvec.add(a);
      assign(origpvec, pvec);
      rescale();
    }

    double l1p1x() {
      return pvec.get(0);
    }

    double l1p1y() {
      return pvec.get(1);
    }

    double l1p2x() {
      return pvec.get(2);
    }

    double l1p2y() {
      return pvec.get(3);
    }

    double l2p1x() {
      return pvec.get(4);
    }

    double l2p1y() {
      return pvec.get(5);
    }

    double l2p2x() {
      return pvec.get(6);
    }

    double l2p2y() {
      return pvec.get(7);
    }

    double angle() {
      return pvec.get(8);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.L2LAngle;
    }

    public void rescale(double coef) {
      scale = coef * 1.;
    }

    public double error() {
      double dx1 = (l1p2x() - l1p1x());
      double dy1 = (l1p2y() - l1p1y());
      double dx2 = (l2p2x() - l2p1x());
      double dy2 = (l2p2y() - l2p1y());
      double a = Math.atan2(dy1, dx1) + angle();
      double ca = Math.cos(a);
      double sa = Math.sin(a);
      double x2 = dx2 * ca + dy2 * sa;
      double y2 = -dx2 * sa + dy2 * ca;
      return scale * Math.atan2(y2, x2);
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == l1p1x() || param == l1p1y() ||
              param == l1p2x() || param == l1p2y()) {
        double dx1 = (l1p2x() - l1p1x());
        double dy1 = (l1p2y() - l1p1y());
        double r2 = dx1 * dx1 + dy1 * dy1;
        if (param == l1p1x()) deriv += -dy1 / r2;
        if (param == l1p1y()) deriv += dx1 / r2;
        if (param == l1p2x()) deriv += dy1 / r2;
        if (param == l1p2y()) deriv += -dx1 / r2;
      }
      if (param == l2p1x() || param == l2p1y() ||
              param == l2p2x() || param == l2p2y()) {
        double dx1 = (l1p2x() - l1p1x());
        double dy1 = (l1p2y() - l1p1y());
        double dx2 = (l2p2x() - l2p1x());
        double dy2 = (l2p2y() - l2p1y());
        double a = Math.atan2(dy1, dx1) + angle();
        double ca = Math.cos(a);
        double sa = Math.sin(a);
        double x2 = dx2 * ca + dy2 * sa;
        double y2 = -dx2 * sa + dy2 * ca;
        double r2 = dx2 * dx2 + dy2 * dy2;
        dx2 = -y2 / r2;
        dy2 = x2 / r2;
        if (param == l2p1x()) deriv += (-ca * dx2 + sa * dy2);
        if (param == l2p1y()) deriv += (-sa * dx2 - ca * dy2);
        if (param == l2p2x()) deriv += (ca * dx2 - sa * dy2);
        if (param == l2p2y()) deriv += (sa * dx2 + ca * dy2);
      }
      if (param == angle()) deriv += -1;

      return scale * deriv;
    }

    public double maxStep(TDoubleObjectHashMap<Double> dir, double lim) {
      // step(angle()) <= pi/18 = 10°
      Double it = dir.get(angle());
      if (it != null) {
        double step = Math.abs(it);
        if (step > Math.PI / 18.)
          lim = Math.min(lim, (Math.PI / 18.) / step);
      }
      return lim;
    }
  }

  // MidpointOnLine
  static public class ConstraintMidpointOnLine extends Constraint {

    public ConstraintMidpointOnLine(Line l1, Line l2) {
      pvec.add(l1.p1.x);
      pvec.add(l1.p1.y);
      pvec.add(l1.p2.x);
      pvec.add(l1.p2.y);
      pvec.add(l2.p1.x);
      pvec.add(l2.p1.y);
      pvec.add(l2.p2.x);
      pvec.add(l2.p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    public ConstraintMidpointOnLine(Point l1p1, Point l1p2, Point l2p1, Point l2p2) {
      pvec.add(l1p1.x);
      pvec.add(l1p1.y);
      pvec.add(l1p2.x);
      pvec.add(l1p2.y);
      pvec.add(l2p1.x);
      pvec.add(l2p1.y);
      pvec.add(l2p2.x);
      pvec.add(l2p2.y);
      assign(origpvec, pvec);
      rescale();
    }

    double l1p1x() {
      return pvec.get(0);
    }

    double l1p1y() {
      return pvec.get(1);
    }

    double l1p2x() {
      return pvec.get(2);
    }

    double l1p2y() {
      return pvec.get(3);
    }

    double l2p1x() {
      return pvec.get(4);
    }

    double l2p1y() {
      return pvec.get(5);
    }

    double l2p2x() {
      return pvec.get(6);
    }

    double l2p2y() {
      return pvec.get(7);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.MidpointOnLine;
    }

    public void rescale(double coef) {
      scale = coef * 1;
    }

    public double error() {
      double x0 = ((l1p1x()) + (l1p2x())) / 2;
      double y0 = ((l1p1y()) + (l1p2y())) / 2;
      double x1 = l2p1x(), x2 = l2p2x();
      double y1 = l2p1y(), y2 = l2p2y();
      double dx = x2 - x1;
      double dy = y2 - y1;
      double d = Math.sqrt(dx * dx + dy * dy);
      double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1; // = x1y2 - x2y1 - x0y2 + x2y0 + x0y1 - x1y0 = 2*(triangle area)
      return scale * area / d;
    }

    public double grad(double param) {
      double deriv = 0.;
      // darea/dx0 = (y1-y2)      darea/dy0 = (x2-x1)
      // darea/dx1 = (y2-y0)      darea/dy1 = (x0-x2)
      // darea/dx2 = (y0-y1)      darea/dy2 = (x1-x0)
      if (param == l1p1x() || param == l1p1y() ||
              param == l1p2x() || param == l1p2y() ||
              param == l2p1x() || param == l2p1y() ||
              param == l2p2x() || param == l2p2y()) {
        double x0 = ((l1p1x()) + (l1p2x())) / 2;
        double y0 = ((l1p1y()) + (l1p2y())) / 2;
        double x1 = l2p1x(), x2 = l2p2x();
        double y1 = l2p1y(), y2 = l2p2y();
        double dx = x2 - x1;
        double dy = y2 - y1;
        double d2 = dx * dx + dy * dy;
        double d = Math.sqrt(d2);
        double area = -x0 * dy + y0 * dx + x1 * y2 - x2 * y1;
        if (param == l1p1x()) deriv += (y1 - y2) / (2 * d);
        if (param == l1p1y()) deriv += (x2 - x1) / (2 * d);
        if (param == l1p2x()) deriv += (y1 - y2) / (2 * d);
        if (param == l1p2y()) deriv += (x2 - x1) / (2 * d);
        if (param == l2p1x()) deriv += ((y2 - y0) * d + (dx / d) * area) / d2;
        if (param == l2p1y()) deriv += ((x0 - x2) * d + (dy / d) * area) / d2;
        if (param == l2p2x()) deriv += ((y0 - y1) * d - (dx / d) * area) / d2;
        if (param == l2p2y()) deriv += ((x1 - x0) * d - (dy / d) * area) / d2;
      }
      return scale * deriv;
    }
  }

  // TangentCircumf
  static public class ConstraintTangentCircumf extends Constraint {

    boolean internal;

    public ConstraintTangentCircumf(Point p1, Point p2,
                                    double rad1, double rad2, boolean internal_) {
      internal = internal_;
      pvec.add(p1.x);
      pvec.add(p1.y);
      pvec.add(p2.x);
      pvec.add(p2.y);
      pvec.add(rad1);
      pvec.add(rad2);
      assign(origpvec, pvec);
      rescale();
    }

    double c1x() {
      return pvec.get(0);
    }

    double c1y() {
      return pvec.get(1);
    }

    double c2x() {
      return pvec.get(2);
    }

    double c2y() {
      return pvec.get(3);
    }

    double r1() {
      return pvec.get(4);
    }

    double r2() {
      return pvec.get(5);
    }

    public ConstraintType getTypeId() {
      return ConstraintType.TangentCircumf;
    }

    public void rescale(double coef) {
      scale = coef * 1;
    }

    public double error() {
      double dx = (c1x() - c2x());
      double dy = (c1y() - c2y());
      if (internal)
        return scale * (Math.sqrt(dx * dx + dy * dy) - Math.abs(r1() - r2()));
      else
        return scale * (Math.sqrt(dx * dx + dy * dy) - (r1() + r2()));
    }

    public double grad(double param) {
      double deriv = 0.;
      if (param == c1x() || param == c1y() ||
              param == c2x() || param == c2y() ||
              param == r1() || param == r2()) {
        double dx = (c1x() - c2x());
        double dy = (c1y() - c2y());
        double d = Math.sqrt(dx * dx + dy * dy);
        if (param == c1x()) deriv += dx / d;
        if (param == c1y()) deriv += dy / d;
        if (param == c2x()) deriv += -dx / d;
        if (param == c2y()) deriv += -dy / d;
        if (internal) {
          if (param == r1()) deriv += (r1() > r2()) ? -1 : 1;
          if (param == r2()) deriv += (r1() > r2()) ? 1 : -1;
        } else {
          if (param == r1()) deriv += -1;
          if (param == r2()) deriv += -1;
        }
      }
      return scale * deriv;
    }
  }
}