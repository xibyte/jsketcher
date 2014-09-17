package cad.freegcs;

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

import gnu.trove.TCollections;
import gnu.trove.iterator.TDoubleIterator;
import gnu.trove.list.TDoubleList;
import gnu.trove.list.TIntList;
import gnu.trove.list.array.TDoubleArrayList;
import gnu.trove.list.array.TIntArrayList;
import gnu.trove.map.TDoubleObjectMap;
import gnu.trove.map.hash.TDoubleObjectHashMap;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static cad.freegcs.Constraints.*;
import static cad.freegcs.GEOM.*;

// http://forum.freecadweb.org/viewtopic.php?f=3&t=4651&start=40

public class System {
  private static final double DBL_EPSILON = Double.MIN_VALUE;

//typedef boost::adjacency_list <boost::vecS, boost::vecS, boost::undirectedS> Graph;

  enum SolveStatus {
    Success,   // Found a solution zeroing the error function
    Converged, // Found a solution minimizing the error function
    Failed     // Failed to find any solution
  }

  enum Algorithm {
    BFGS,
    LevenbergMarquardt,
    DogLeg
  }

  double XconvergenceRough = 1e-8;
  double XconvergenceFine = 1e-10;
  double smallF = 1e-20;
  int MaxIterations = 100; //Note that the total number of iterations allowed is MaxIterations *xLength

  TDoubleList plist; // list of the unknown parameters
  TDoubleObjectMap<Integer> pIndex;

  List<Constraints.Constraint> clist;
  Map<Constraint, TDoubleList> c2p; // constraint to parameter adjacency list
  TDoubleObjectMap<List<Constraints.Constraint>> p2c; // parameter to constraint adjacency list

  List<SubSystem> subSystems, subSystemsAux;

  TDoubleList reference;

  List<TDoubleList> plists;                    // partitioned plist except equality constraints
  List<List<Constraint>> clists; // partitioned clist except equality constraints
  List<TDoubleObjectMap<Double>> reductionmaps;          // for simplification of equality constraints

  int dofs;
  Set<Constraint> redundant;
  TIntList conflictingTags, redundantTags;

  boolean hasUnknowns;  // if plist is filled with the unknown parameters
  boolean hasDiagnosis; // if dofs, conflictingTags, redundantTags are up to date
  boolean isInit;       // if plists, clists, reductionmaps are up to date

///////////////////////////////////////
// Solver
///////////////////////////////////////

  // System
  public System() {
    plist = new TDoubleArrayList();
    clist = new ArrayList<>();
    c2p = new HashMap<>();
    p2c = new TDoubleObjectHashMap<>();
    subSystems = new ArrayList<>();
    subSystemsAux = new ArrayList<>();
    reference = new TDoubleArrayList();
    hasUnknowns = false;
    hasDiagnosis = false;
    isInit = false;
  }

  public System(List<Constraint> clist_) {
    this();
    // create own (shallow) copy of constraints
    for (Constraint constr : clist) {
      if (constr.getTypeId().equals(ConstraintType.None)) {
        continue;
      }
      Constraint newconstr = constr.copy();
      addConstraint(newconstr);
    }
  }

  void clear() {
    plist.clear();
    pIndex.clear();
    hasUnknowns = false;
    hasDiagnosis = false;

    redundant.clear();
    conflictingTags.clear();
    redundantTags.clear();

    reference.clear();
    clearSubSystems();
    c2p.clear();
    p2c.clear();
  }

  void clearByTag(int tagId) {
    List<Constraint> toRemove = clist.stream().filter(constraint -> tagId == constraint.getTag()).collect(Collectors.toList());
    for (Constraint constr : toRemove) {
      removeConstraint(constr);
    }
  }

  int addConstraint(Constraint constr) {
    isInit = false;
    if (constr.getTag() >= 0) // negatively tagged constraints have no impact
    {
      hasDiagnosis = false;  // on the diagnosis
    }

    clist.add(constr);
    TDoubleArrayList constr_params = constr.params();
    TDoubleIterator it = constr_params.iterator();
    while (it.hasNext()) {
      double param = it.next();
//        jacobi.set(constr, *param, 0.);
      c2p.get(constr).add(param);
      p2c.get(param).add(constr);
    }
    return clist.size() - 1;
  }

  void removeConstraint(Constraint constr) {

    clist.remove(constr);
    if (constr.getTag() >= 0) {
      hasDiagnosis = false;
    }

    clearSubSystems();

    TDoubleList constr_params = c2p.get(constr);

    TDoubleIterator it = constr_params.iterator();
    while (it.hasNext()) {
      double param = it.next();
      p2c.remove(param);
    }
    c2p.remove(constr);
  }

// basic constraints

  int addConstraintEqual(double param1, double param2, int tagId) {
    Constraint constr = new ConstraintEqual(param1, param2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintDifference(double param1, double param2,
                              double difference, int tagId) {
    Constraint constr = new ConstraintDifference(param1, param2, difference);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintP2PDistance(Point p1, Point p2, double distance, int tagId) {
    Constraint constr = new ConstraintP2PDistance(p1, p2, distance);
    constr.setTag(tagId);
    return addConstraint(constr);
  }


  int addConstraintP2PAngle(Point p1, Point p2, double angle,
                            double incrAngle) {
    return addConstraintP2PAngle(p1, p2, angle, incrAngle, 0);

  }

  int addConstraintP2PAngle(Point p1, Point p2, double angle,
                            double incrAngle, int tagId) {
    Constraint constr = new ConstraintP2PAngle(p1, p2, angle, incrAngle);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

//  int addConstraintP2PAngle(Point p1, Point p2, double * angle, int tagId) {
//    return addConstraintP2PAngle(p1, p2, angle, 0.);
//  }

  int addConstraintP2LDistance(Point p, Line l, double distance, int tagId) {
    Constraint constr = new ConstraintP2LDistance(p, l, distance);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPointOnLine(Point p, Line l, int tagId) {
    Constraint constr = new ConstraintPointOnLine(p, l);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPointOnLine(Point p, Point lp1, Point lp2, int tagId) {
    Constraint constr = new ConstraintPointOnLine(p, lp1, lp2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPointOnPerpBisector(Point p, Line l, int tagId) {
    Constraint constr = new ConstraintPointOnPerpBisector(p, l);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPointOnPerpBisector(Point p, Point lp1, Point lp2, int tagId) {
    Constraint constr = new ConstraintPointOnPerpBisector(p, lp1, lp2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintParallel(Line l1, Line l2, int tagId) {
    Constraint constr = new ConstraintParallel(l1, l2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPerpendicular(Line l1, Line l2, int tagId) {
    Constraint constr = new ConstraintPerpendicular(l1, l2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintPerpendicular(Point l1p1, Point l1p2,
                                 Point l2p1, Point l2p2, int tagId) {
    Constraint constr = new ConstraintPerpendicular(l1p1, l1p2, l2p1, l2p2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintL2LAngle(Line l1, Line l2, double angle, int tagId) {
    Constraint constr = new ConstraintL2LAngle(l1, l2, angle);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintL2LAngle(Point l1p1, Point l1p2,
                            Point l2p1, Point l2p2, double angle, int tagId) {
    Constraint constr = new ConstraintL2LAngle(l1p1, l1p2, l2p1, l2p2, angle);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintMidpointOnLine(Line l1, Line l2, int tagId) {
    Constraint constr = new ConstraintMidpointOnLine(l1, l2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintMidpointOnLine(Point l1p1, Point l1p2,
                                  Point l2p1, Point l2p2, int tagId) {
    Constraint constr = new ConstraintMidpointOnLine(l1p1, l1p2, l2p1, l2p2);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

  int addConstraintTangentCircumf(Point p1, Point p2, double rad1, double rad2,
                                  boolean internal, int tagId) {
    Constraint constr = new ConstraintTangentCircumf(p1, p2, rad1, rad2, internal);
    constr.setTag(tagId);
    return addConstraint(constr);
  }

// derived constraints

  int addConstraintP2PCoincident(Point p1, Point p2, int tagId) {
    addConstraintEqual(p1.x, p2.x, tagId);
    return addConstraintEqual(p1.y, p2.y, tagId);
  }

  int addConstraintHorizontal(Line l, int tagId) {
    return addConstraintEqual(l.p1.y, l.p2.y, tagId);
  }

  int addConstraintHorizontal(Point p1, Point p2, int tagId) {
    return addConstraintEqual(p1.y, p2.y, tagId);
  }

  int addConstraintVertical(Line l, int tagId) {
    return addConstraintEqual(l.p1.x, l.p2.x, tagId);
  }

  int addConstraintVertical(Point p1, Point p2, int tagId) {
    return addConstraintEqual(p1.x, p2.x, tagId);
  }

  int addConstraintCoordinateX(Point p, double x, int tagId) {
    return addConstraintEqual(p.x, x, tagId);
  }

  int addConstraintCoordinateY(Point p, double y, int tagId) {
    return addConstraintEqual(p.y, y, tagId);
  }

  int addConstraintArcRules(Arc a, int tagId) {
    addConstraintP2PAngle(a.center, a.start, a.startAngle, tagId);
    addConstraintP2PAngle(a.center, a.end, a.endAngle, tagId);
    addConstraintP2PDistance(a.center, a.start, a.rad, tagId);
    return addConstraintP2PDistance(a.center, a.end, a.rad, tagId);
  }

  int addConstraintPointOnCircle(Point p, Circle c, int tagId) {
    return addConstraintP2PDistance(p, c.center, c.rad, tagId);
  }

  int addConstraintPointOnArc(Point p, Arc a, int tagId) {
    return addConstraintP2PDistance(p, a.center, a.rad, tagId);
  }

  int addConstraintPerpendicularLine2Arc(Point p1, Point p2, Arc a,
                                         int tagId) {
    addConstraintP2PCoincident(p2, a.start, tagId);
    double dx = (p2.x) - (p1.x);
    double dy = (p2.y) - (p1.y);
    if (dx * Math.cos((a.startAngle)) + dy * Math.sin((a.startAngle)) > 0) {
      return addConstraintP2PAngle(p1, p2, a.startAngle, 0, tagId);
    } else {
      return addConstraintP2PAngle(p1, p2, a.startAngle, Math.PI, tagId);
    }
  }

  int addConstraintPerpendicularArc2Line(Arc a, Point p1, Point p2,
                                         int tagId) {
    addConstraintP2PCoincident(p1, a.end, tagId);
    double dx = (p2.x) - (p1.x);
    double dy = (p2.y) - (p1.y);
    if (dx * Math.cos((a.endAngle)) + dy * Math.sin((a.endAngle)) > 0) {
      return addConstraintP2PAngle(p1, p2, a.endAngle, 0, tagId);
    } else {
      return addConstraintP2PAngle(p1, p2, a.endAngle, Math.PI, tagId);
    }
  }

  int addConstraintPerpendicularCircle2Arc(Point center, double radius,
                                           Arc a, int tagId) {
    addConstraintP2PDistance(a.start, center, radius, tagId);
    double incrAngle = (a.startAngle) < (a.endAngle) ? Math.PI / 2 : -Math.PI / 2;
    double tangAngle = a.startAngle + incrAngle;
    double dx = (a.start.x) - (center.x);
    double dy = (a.start.y) - (center.y);
    if (dx * Math.cos(tangAngle) + dy * Math.sin(tangAngle) > 0) {
      return addConstraintP2PAngle(center, a.start, a.startAngle, incrAngle, tagId);
    } else {
      return addConstraintP2PAngle(center, a.start, a.startAngle, -incrAngle, tagId);
    }
  }

  int addConstraintPerpendicularArc2Circle(Arc a, Point center,
                                           double radius, int tagId) {
    addConstraintP2PDistance(a.end, center, radius, tagId);
    double incrAngle = (a.startAngle) < (a.endAngle) ? -Math.PI / 2 : Math.PI / 2;
    double tangAngle = a.endAngle + incrAngle;
    double dx = (a.end.x) - (center.x);
    double dy = (a.end.y) - (center.y);
    if (dx * Math.cos(tangAngle) + dy * Math.sin(tangAngle) > 0) {
      return addConstraintP2PAngle(center, a.end, a.endAngle, incrAngle, tagId);
    } else {
      return addConstraintP2PAngle(center, a.end, a.endAngle, -incrAngle, tagId);
    }
  }

  int addConstraintPerpendicularArc2Arc(Arc a1, boolean reverse1,
                                        Arc a2, boolean reverse2, int tagId) {
    Point p1 = reverse1 ? a1.start : a1.end;
    Point p2 = reverse2 ? a2.end : a2.start;
    addConstraintP2PCoincident(p1, p2, tagId);
    return addConstraintPerpendicular(a1.center, p1, a2.center, p2, tagId);
  }

  int addConstraintTangent(Line l, Circle c, int tagId) {
    return addConstraintP2LDistance(c.center, l, c.rad, tagId);
  }

  int addConstraintTangent(Line l, Arc a, int tagId) {
    return addConstraintP2LDistance(a.center, l, a.rad, tagId);
  }

  int addConstraintTangent(Circle c1, Circle c2, int tagId) {
    double dx = (c2.center.x) - (c1.center.x);
    double dy = (c2.center.y) - (c1.center.y);
    double d = Math.sqrt(dx * dx + dy * dy);
    return addConstraintTangentCircumf(c1.center, c2.center, c1.rad, c2.rad,
            (d < c1.rad || d < c2.rad), tagId);
  }

  int addConstraintTangent(Arc a1, Arc a2, int tagId) {
    double dx = (a2.center.x) - (a1.center.x);
    double dy = (a2.center.y) - (a1.center.y);
    double d = Math.sqrt(dx * dx + dy * dy);
    return addConstraintTangentCircumf(a1.center, a2.center, a1.rad, a2.rad,
            (d < a1.rad || d < a2.rad), tagId);
  }

  int addConstraintTangent(Circle c, Arc a, int tagId) {
    double dx = (a.center.x) - (c.center.x);
    double dy = (a.center.y) - (c.center.y);
    double d = Math.sqrt(dx * dx + dy * dy);
    return addConstraintTangentCircumf(c.center, a.center, c.rad, a.rad,
            (d < c.rad || d < a.rad), tagId);
  }

  int addConstraintTangentLine2Arc(Point p1, Point p2, Arc a, int tagId) {
    addConstraintP2PCoincident(p2, a.start, tagId);
    double incrAngle = (a.startAngle) < (a.endAngle) ? Math.PI / 2 : -Math.PI / 2;
    return addConstraintP2PAngle(p1, p2, a.startAngle, incrAngle, tagId);
  }

  int addConstraintTangentArc2Line(Arc a, Point p1, Point p2, int tagId) {
    addConstraintP2PCoincident(p1, a.end, tagId);
    double incrAngle = (a.startAngle) < (a.endAngle) ? Math.PI / 2 : -Math.PI / 2;
    return addConstraintP2PAngle(p1, p2, a.endAngle, incrAngle, tagId);
  }

  int addConstraintTangentCircle2Arc(Circle c, Arc a, int tagId) {
    addConstraintPointOnCircle(a.start, c, tagId);
    double dx = (a.start.x) - (c.center.x);
    double dy = (a.start.y) - (c.center.y);
    if (dx * Math.cos((a.startAngle)) + dy * Math.sin((a.startAngle)) > 0) {
      return addConstraintP2PAngle(c.center, a.start, a.startAngle, 0, tagId);
    } else {
      return addConstraintP2PAngle(c.center, a.start, a.startAngle, Math.PI, tagId);
    }
  }

  int addConstraintTangentArc2Circle(Arc a, Circle c, int tagId) {
    addConstraintPointOnCircle(a.end, c, tagId);
    double dx = (a.end.x) - (c.center.x);
    double dy = (a.end.y) - (c.center.y);
    if (dx * Math.cos((a.endAngle)) + dy * Math.sin((a.endAngle)) > 0) {
      return addConstraintP2PAngle(c.center, a.end, a.endAngle, 0, tagId);
    } else {
      return addConstraintP2PAngle(c.center, a.end, a.endAngle, Math.PI, tagId);
    }
  }

  int addConstraintTangentArc2Arc(Arc a1, boolean reverse1, Arc a2, boolean reverse2,
                                  int tagId) {
    Point p1 = reverse1 ? a1.start : a1.end;
    Point p2 = reverse2 ? a2.end : a2.start;
    addConstraintP2PCoincident(p1, p2, tagId);

    double angle1 = reverse1 ? a1.startAngle : a1.endAngle;
    double angle2 = reverse2 ? a2.endAngle : a2.startAngle;
    if (Math.cos(angle1) * Math.cos(angle2) + Math.sin(angle1) * Math.sin(angle2) > 0) {
      return addConstraintEqual(angle1, angle2, tagId);
    } else {
      return addConstraintP2PAngle(p2, a2.center, angle1, 0, tagId);
    }
  }

  int addConstraintCircleRadius(Circle c, double radius, int tagId) {
    return addConstraintEqual(c.rad, radius, tagId);
  }

  int addConstraintArcRadius(Arc a, double radius, int tagId) {
    return addConstraintEqual(a.rad, radius, tagId);
  }

  int addConstraintEqualLength(Line l1, Line l2, double length, int tagId) {
    addConstraintP2PDistance(l1.p1, l1.p2, length, tagId);
    return addConstraintP2PDistance(l2.p1, l2.p2, length, tagId);
  }

  int addConstraintEqualRadius(Circle c1, Circle c2, int tagId) {
    return addConstraintEqual(c1.rad, c2.rad, tagId);
  }

  int addConstraintEqualRadius(Circle c1, Arc a2, int tagId) {
    return addConstraintEqual(c1.rad, a2.rad, tagId);
  }

  int addConstraintEqualRadius(Arc a1, Arc a2, int tagId) {
    return addConstraintEqual(a1.rad, a2.rad, tagId);
  }

  int addConstraintP2PSymmetric(Point p1, Point p2, Line l, int tagId) {
    addConstraintPerpendicular(p1, p2, l.p1, l.p2, tagId);
    return addConstraintMidpointOnLine(p1, p2, l.p1, l.p2, tagId);
  }

  int addConstraintP2PSymmetric(Point p1, Point p2, Point p, int tagId) {
    addConstraintPointOnPerpBisector(p, p1, p2, tagId);
    return addConstraintPointOnLine(p, p1, p2, tagId);
  }


  void rescaleConstraint(int id, double coeff) {
    if (id >= clist.size() || id < 0) {
      return;
    }
    clist.get(id).rescale(coeff);
  }

  void declareUnknowns(TDoubleList params) {
    plist = params;
    pIndex.clear();
    for (int i = 0; i < plist.size(); ++i) {
      pIndex.put(plist.get(i), i);
    }
    hasUnknowns = true;
  }

  void initSolution() {
    // - Stores the current parameters values in the vector "reference"
    // - identifies any decoupled subsystems and partitions the original
    //   system into corresponding components
    // - Stores the current parameters in the vector "reference"
    // - Identifies the equality constraints tagged with ids >= 0
    //   and prepares a corresponding system reduction
    // - Organizes the rest of constraints into two subsystems for
    //   tag ids >=0 and < 0 respectively and applies the
    //   system reduction specified in the previous step

    isInit = false;
    if (!hasUnknowns) {
      return;
    }

    // storing reference configuration
    setReference();

    // diagnose conflicting or redundant constraints
    if (!hasDiagnosis) {
      diagnose();
      if (!hasDiagnosis) {
        return;
      }
    }
    List<Constraint> clistR = new ArrayList<>();
    if (!redundant.isEmpty()) {
      for (Constraint constr : clist) {
        if (redundant.contains(constr)) {
          clistR.add(constr);
        }
      }
    } else {
      clistR = clist;
    }

    // partitioning into decoupled components
    Graph g = new Graph();
    for (int i = 0; i < plist.size() + clistR.size(); i++) {
      g.add_vertex();
    }

    int cvtid = plist.size();
    for (Constraint constr : clistR) {


      TDoubleList cparams = c2p.get(constr);

      TDoubleIterator pit = cparams.iterator();
      while (pit.hasNext()) {
        double param = pit.next();
        Integer it = pIndex.get(param);
        if (it != null) {
          g.add_edge(cvtid, it);
        }
      }
      cvtid++;
    }

    TIntList components = new TIntArrayList();
    int num_vertices = g.num_vertices();
    int componentsSize = 0;
    if (num_vertices > 0) {
      componentsSize = g.connected_components(components);
    }

    // identification of equality constraints and parameter reduction
    Set<Constraint> reducedConstrs = new HashSet<>();  // constraints that will be eliminated through reduction
    reductionmaps.clear(); // destroy any maps
//    reductionmaps.resize(componentsSize); // create empty maps to be filled in
    {
      TDoubleList reducedParams = new TDoubleArrayList(plist);

      for (Constraint constr : clistR) {
        if (constr.getTag() >= 0 && ConstraintType.Equal.equals(constr.getTypeId())) {

          Integer it1 = pIndex.get(constr.params().get(0));
          Integer it2 = pIndex.get(constr.params().get(1));
          if (it1 != null && it2 != null) {
            reducedConstrs.add(constr);
            double p_kept = reducedParams.get(it1);
            double p_replaced = reducedParams.get(it2);
            for (int i = 0; i < plist.size(); ++i) {
              if (reducedParams.get(i) == p_replaced) {
                reducedParams.set(i, p_kept);
              }
            }
          }
        }
      }
      for (int i = 0; i < plist.size(); ++i) {
        if (plist.get(i) != reducedParams.get(i)) {
          int cid = components.get(i);
          reductionmaps.get(cid).put(plist.get(i), reducedParams.get(i));
        }
      }
    }

    clists.clear(); // destroy any lists
//    clists.resize(componentsSize); // create empty lists to be filled in
    {
      int i = plist.size();
      for (Constraint constr : clistR) {
        if (!reducedConstrs.contains(constr)) {
          int cid = components.get(i);
          clists.get(cid).add(constr);
        }
        i++;
      }
    }

    plists.clear(); // destroy any lists
//    plists.resize(componentsSize); // create empty lists to be filled in
    for (int i = 0; i < plist.size(); ++i) {
      int cid = components.get(i);
      plists.get(cid).add(plist.get(i));
    }

    // calculates subSystems and subSystemsAux from clists, plists and reductionmaps
    clearSubSystems();
    for (int cid = 0; cid < clists.size(); cid++) {
      List<Constraint> clist0 = new ArrayList<>();
      List<Constraint> clist1 = new ArrayList<>();

      for (Constraint constr : clists.get(cid)) {
        if (constr.getTag() >= 0) {
          clist0.add(constr);
        } else // move or distance from reference constraints
        {
          clist1.add(constr);
        }
      }

      subSystems.add(null);
      subSystemsAux.add(null);
      if (clist0.size() > 0) {
        subSystems.set(cid, new SubSystem(clist0, plists.get(cid), reductionmaps.get(cid)));
      }
      if (clist1.size() > 0) {
        subSystemsAux.set(cid, new SubSystem(clist1, plists.get(cid), reductionmaps.get(cid)));
      }
    }

    isInit = true;
  }

  void setReference() {
    reference.clear();
//    reference.reserve(plist.size());
    for (param:
         plist) {

    }

    TDoubleIterator it = plist.iterator();
    while (it.hasNext()) {
      double param = it.next();
      reference.add(param);
    }
  }

  void resetToReference() {
    if (reference.size() == plist.size()) {
      for (int i = 0; i < plist.size(); i++) {
        plist.set(i, reference.get(i));

      }
    }
  }

  SolveStatus solve(TDoubleList params, boolean isFine, Algorithm alg) {
    declareUnknowns(params);
    initSolution();
    return solve(isFine, alg);
  }

  SolveStatus solve(boolean isFine, Algorithm alg) {
    if (!isInit) {
      return SolveStatus.Failed;
    }

    boolean isReset = false;
    // return success by default in order to permit coincidence constraints to be applied
    // even if no other system has to be solved
    int res = SolveStatus.Success.ordinal();
    for (int cid = 0; cid < subSystems.size(); cid++) {
      if ((subSystems.get(cid) != null || subSystemsAux.get(cid) != null) && !isReset) {
        resetToReference();
        isReset = true;
      }
      if (subSystems.get(cid) && subSystemsAux.get(cid)) {
        res = Math.max(res, solve(subSystems.get(cid), subSystemsAux.get(cid), isFine).ordinal());
      } else if (subSystems.get(cid) != null) {
        res = Math.max(res, solve(subSystems.get(cid), isFine, alg).ordinal());
      } else if (subSystemsAux.get(cid) != null) {
        res = Math.max(res, solve(subSystemsAux.get(cid), isFine, alg).ordinal());
      }
    }
    if (res == SolveStatus.Success.ordinal()) {
      for (Constraint constr : redundant) {
        if (constr.error() > XconvergenceFine) {
          res = SolveStatus.Converged.ordinal();
          return SolveStatus.Converged;
        }
      }
    }
    return SolveStatus.values()[res];
  }

  SolveStatus solve(SubSystem subsys, boolean isFine, Algorithm alg) {
    if (alg == Algorithm.BFGS) {
      return solve_BFGS(subsys, isFine);
    } else if (alg == Algorithm.LevenbergMarquardt) {
      return solve_LM(subsys);
    } else if (alg == Algorithm.DogLeg) {
      return solve_DL(subsys);
    } else {
      return SolveStatus.Failed;
    }
  }

  SolveStatus solve_BFGS(SubSystem subsys, boolean isFine) {
    int xsize = subsys.pSize();
    if (xsize == 0) {
      return SolveStatus.Success;
    }

    subsys.redirectParams();

    RealMatrix D = new Array2DRowRealMatrix(xsize, xsize);
    identity(D);
//    
    RealMatrix x = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix xdir = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix grad = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix h = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix y = new Array2DRowRealMatrix(xsize, 1);
    RealMatrix Dy = new Array2DRowRealMatrix(xsize, 1);

    // Initial unknowns vector and initial gradient vector
    subsys.getParams(x);
    subsys.calcGrad(grad);

    // Initial search direction oposed to gradient (steepest-descent)
    xdir = grad.scalarMultiply(-1);
    lineSearch(subsys, xdir);
    double err = subsys.error();

    h = x;
    subsys.getParams(x);
    h = x.subtract(h); // = x - xold

    double convergence = isFine ? XconvergenceFine : XconvergenceRough;
    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * err + 1e12;

    for (int iter = 1; iter < maxIterNumber; iter++) {

      if (h.getFrobeniusNorm() <= convergence || err <= smallF) {
        break;
      }
      if (err > divergingLim || err != err) // check for diverging and NaN
      {
        break;
      }

      y = grad;
      subsys.calcGrad(grad);
      y = grad.subtract(y); // = grad - gradold

      double hty = dotProduct(h, y);
      //make sure that hty is never 0
      if (hty == 0) {
        hty = .0000000001;
      }

      Dy = D.multiply(y);

      double ytDy = dotProduct(y, Dy);

      //Now calculate the BFGS update on D
      D = D.add(h.scalarMultiply((1. + ytDy / hty) / hty).multiply(h.transpose()));
      D = D.subtract((
                      h.multiply(Dy.transpose())
                              .add(Dy.multiply(h.transpose()))
              ).scalarMultiply(1. / hty)
      );

      xdir = D.scalarMultiply(-1).multiply(grad);
      lineSearch(subsys, xdir);
      err = subsys.error();

      h = x;
      subsys.getParams(x);
      h = x.subtract(h); // = x - xold
    }

    subsys.revertParams();

    if (err <= smallF) {
      return SolveStatus.Success;
    }
    if (h.getFrobeniusNorm() <= convergence) {
      return SolveStatus.Converged;
    }
    return SolveStatus.Failed;
  }

  private double dotProduct(RealMatrix m1, RealMatrix m2) {
    return new ArrayRealVector(m1.getData()[0]).dotProduct(new ArrayRealVector(m2.getData()[0]));
  }

  private RealVector m(RealMatrix matrix, RealVector vector) {
    Array2DRowRealMatrix vm = new Array2DRowRealMatrix(vector.toArray());
    RealMatrix product = matrix.multiply(vm);
    return new ArrayRealVector(product.getData()[0]);
  }

  private void identity(RealMatrix m) {
    for (int i = 0; i < m.getColumnDimension() && i < m.getRowDimension(); i++) {
      m.setEntry(i, i, 1.0);
    }
  }

  int solve_LM(SubSystem subsys) {
    int xsize = subsys.pSize();
    int csize = subsys.cSize();

    if (xsize == 0) {
      return Success;
    }

    RealMatrix e = mtrx(csize), e_new = mtrx(csize); // vector of all function errors (every constraint is one function)
    RealMatrix J = mtrx(csize, xsize);        // Jacobi of the subsystem
    RealMatrix A = mtrx(xsize, xsize);
    RealMatrix x = mtrx(xsize), h = mtrx(xsize), x_new = mtrx(xsize), g = mtrx(xsize);
    double[] diag_A;

    subsys.redirectParams();

    subsys.getParams(x);
    subsys.calcResidual(e);
    e = e.scalarMultiply(-1);

    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * squaredNorm(e) + 1e12;

    double eps = 1e-10, eps1 = 1e-80;
    double tau = 1e-3;
    double nu = 2, mu = 0;
    int iter = 0, stop = 0;
    for (iter = 0; iter < maxIterNumber && stop == 0; ++iter) {

      // check error
      double err = squaredNorm(e);
      if (err <= eps) { // error is small, Success
        stop = 1;
        break;
      } else if (err > divergingLim || err != err) { // check for diverging and NaN
        stop = 6;
        break;
      }

      // J^T J, J^T e
      subsys.calcJacobi(J);
      ;

      A = J.transpose().multiply(J);
      g = J.transpose().multiply(e);

      // Compute ||J^T e||_inf
      double g_inf = infinityNorm(g);
      diag_A = A.diagonal(); // save diagonal entries so that augmentation can be later canceled

      // check for convergence
      if (g_inf <= eps1) {
        stop = 2;
        break;
      }

      // compute initial damping factor
      if (iter == 0) {
        mu = tau * infinityNorm(diag_A);
      }

      // determine increment using adaptive damping
      int k = 0;
      while (k < 50) {
        // augment normal equations A = A+uI
        for (int i = 0; i < xsize; ++i) {
          A.addToEntry(i, i, mu);
        }

        //solve augmented functions A*h=-g

        h = new LUDecomposition(A).getSolver().solve(g);
        ;
        double rel_error = (A.multiply(h).subtract(g)).getFrobeniusNorm() / g.getFrobeniusNorm();

        // check if solving works
        if (rel_error < 1e-5) {

          // restrict h according to maxStep
          double scale = subsys.maxStep(h);
          if (scale < 1.) {
            h = h.scalarMultiply(scale);
          }

          // compute par's new estimate and ||d_par||^2
          x_new = x.add(h);
          double h_norm = squaredNorm(h);

          if (h_norm <= eps1 * eps1 * x.getFrobeniusNorm()) { // relative change in p is small, stop
            stop = 3;
            break;
          } else if (h_norm >= (x.getFrobeniusNorm() + eps1) / (DBL_EPSILON * DBL_EPSILON)) { // almost singular
            stop = 4;
            break;
          }

          subsys.setParams(x_new);
          subsys.calcResidual(e_new);
          e_new = e_new.scalarMultiply(-1);

          double dF = squaredNorm(e) - squaredNorm(e_new);
          double dL = dot(h, (h.scalarMultiply(mu).add(g)));

          if (dF > 0. && dL > 0.) { // reduction in error, increment is accepted
            double tmp = 2 * dF / dL - 1.;
            mu *= Math.max(1. / 3., 1. - tmp * tmp * tmp);
            nu = 2;

            // update par's estimate
            x = x_new;
            e = e_new;
            break;
          }
        }

        // if this point is reached, either the linear system could not be solved or
        // the error did not reduce; in any case, the increment must be rejected

        mu *= nu;
        nu *= 2.0;
        for (int i = 0; i < xsize; ++i) // restore diagonal J^T J entries
        {
          A.setEntry(i, i, diag_A[i]);
        }

        k++;
      }
      if (k > 50) {
        stop = 7;
        break;
      }
    }

    if (iter >= maxIterNumber) {
      stop = 5;
    }

    subsys.revertParams();

    return (stop == 1) ? Success : Failed;
  }

  private double dot(RealMatrix m1, RealMatrix m2) {
    return new ArrayRealVector(m1.getData()[0]).dotProduct(new ArrayRealVector(m2.getData()[0]));
  }

  private double infinityNorm(RealMatrix g) {
    return new ArrayRealVector(g.getData()[0]).getLInfNorm();
  }

  private double squaredNorm(RealMatrix matrix) {
    double norm = matrix.getFrobeniusNorm();
    return norm * norm;
  }

  private RealMatrix mtrx(int size) {
    return new Array2DRowRealMatrix(size, 1);
  }

  private RealMatrix mtrx(int rsize, int csize) {
    return new Array2DRowRealMatrix(rsize, csize);
  }

  SolveStatus solve_DL(SubSystem subsys) {
    double tolg = 1e-80, tolx = 1e-80, tolf = 1e-10;

    int xsize = subsys.pSize();
    int csize = subsys.cSize();

    if (xsize == 0) {
      return SolveStatus.Success;
    }

    RealMatrix x = mtrx(xsize), x_new = mtrx(xsize);
    RealMatrix fx = mtrx(csize), fx_new = mtrx(csize);
    RealMatrix Jx = mtrx(csize, xsize), Jx_new = mtrx(csize, xsize);
    RealMatrix g = mtrx(xsize), h_sd = mtrx(xsize), h_gn = mtrx(xsize), h_dl = mtrx(xsize);

    subsys.redirectParams();

    double err;
    subsys.getParams(x);
    subsys.calcResidual(fx, err);
    subsys.calcJacobi(Jx);

    g = Jx.transpose().multiply(fx.scalarMultiply(-1));

    // get the infinity norm fx_inf and g_inf
    double g_inf = infinityNorm(g);
    double fx_inf = infinityNorm(fx);

    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * err + 1e12;

    double delta = 0.1;
    double alpha = 0.;
    double nu = 2.;
    int iter = 0, stop = 0, reduce = 0;
    while (stop == 0) {

      // check if finished
      if (fx_inf <= tolf) // Success
      {
        stop = 1;
      } else if (g_inf <= tolg) {
        stop = 2;
      } else if (delta <= tolx * (tolx + x.getFrobeniusNorm())) {
        stop = 2;
      } else if (iter >= maxIterNumber) {
        stop = 4;
      } else if (err > divergingLim || err != err) { // check for diverging and NaN
        stop = 6;
      } else {
        // get the steepest descent direction
        alpha = squaredNorm(g) / squaredNorm((Jx.multiply(g)));
        h_sd = g.scalarMultiply(alpha);

        // get the gauss-newton step
        h_gn = new LUDecomposition(Jx).getSolver().solve(fx.scalarMultiply(-1));
        double rel_error = (Jx.multiply(h_gn).add(fx)).getFrobeniusNorm() / fx.getFrobeniusNorm();
        if (rel_error > 1e15) {
          break;
        }

        // compute the dogleg step
        if (h_gn.getFrobeniusNorm() < delta) {
          h_dl = h_gn;
          if (h_dl.getFrobeniusNorm() <= tolx * (tolx + x.getFrobeniusNorm())) {
            stop = 5;
            break;
          }
        } else if (alpha * g.getFrobeniusNorm() >= delta) {
          h_dl = h_sd.scalarMultiply(delta / (alpha * g.getFrobeniusNorm()));
        } else {
          //compute beta
          double beta = 0;
          RealMatrix b = h_gn.subtract(h_sd);
          double bb = (b.transpose().multiply(b)).getFrobeniusNorm();
          double gb = (h_sd.transpose().multiply(b)).getFrobeniusNorm();
          double c = (delta + h_sd.getFrobeniusNorm()) * (delta - h_sd.getFrobeniusNorm());

          if (gb > 0) {
            beta = c / (gb + Math.sqrt(gb * gb + c * bb));
          } else {
            beta = (Math.sqrt(gb * gb + c * bb) - gb) / bb;
          }

          // and update h_dl and dL with beta
          h_dl = h_sd + b.scalarMultiply(beta);
        }
      }

      // see if we are already finished
      if (stop != 0) {
        break;
      }

// it didn't work in some tests
//        // restrict h_dl according to maxStep
//        double scale = subsys->maxStep(h_dl);
//        if (scale < 1.)
//            h_dl *= scale;

      // get the new values
      double err_new;
      x_new = x.add(h_dl);
      subsys.setParams(x_new);
      subsys.calcResidual(fx_new, err_new);
      subsys.calcJacobi(Jx_new);

      // calculate the linear model and the update ratio
      double dL = err - 0.5 * squaredNorm((fx.add(Jx.multiply(h_dl))));
      double dF = err - err_new;
      double rho = dL / dF;

      if (dF > 0 && dL > 0) {
        x = x_new;
        Jx = Jx_new;
        fx = fx_new;
        err = err_new;

        g = Jx.transpose().multiply(fx.scalarMultiply(-1));

        // get infinity norms
        g_inf = infinityNorm(g);
        fx_inf = infinityNorm(fx);
      } else {
        rho = -1;
      }

      // update delta
      if (Math.abs(rho - 1.) < 0.2 && h_dl.getFrobeniusNorm() > delta / 3. && reduce <= 0) {
        delta = 3 * delta;
        nu = 2;
        reduce = 0;
      } else if (rho < 0.25) {
        delta = delta / nu;
        nu = 2 * nu;
        reduce = 2;
      } else {
        reduce--;
      }

      // count this iteration and start again
      iter++;
    }

    subsys.revertParams();

    return (stop == 1) ? SolveStatus.Success : SolveStatus.Failed;
  }

  // The following solver variant solves a system compound of two subsystems
// treating the first of them as of higher priority than the second
  int solve(SubSystem subsysA, SubSystem subsysB, boolean isFine) {
    int xsizeA = subsysA.pSize();
    int xsizeB = subsysB.pSize();
    int csizeA = subsysA.cSize();

    TDoubleList plistAB = new TDoubleArrayList(xsizeA + xsizeB);
    {
      TDoubleList plistA = new TDoubleArrayList(), plistB = new TDoubleArrayList();
      subsysA.getParamList(plistA);
      subsysB.getParamList(plistB);


      plistA.sort();
      plistB.sort();

      VEC_pD::const_iterator it;
      it = std::set_union (plistA.begin(), plistA.end(),
            plistB.begin(), plistB.end(), plistAB.begin());
      plistAB.resize(it - plistAB.begin());
    }
    int xsize = plistAB.size();

    Eigen::MatrixXd B = Eigen::MatrixXd::Identity(xsize, xsize);
    Eigen::MatrixXd JA(csizeA, xsize);
    Eigen::MatrixXd Y, Z;

    Eigen::VectorXd resA(csizeA);
    Eigen::VectorXd lambda(csizeA), lambda0(csizeA), lambdadir(csizeA);
    Eigen::VectorXd x(xsize), x0(xsize), xdir(xsize), xdir1(xsize);
    Eigen::VectorXd grad(xsize);
    Eigen::VectorXd h(xsize);
    Eigen::VectorXd y(xsize);
    Eigen::VectorXd Bh(xsize);

    // We assume that there are no common constraints in subsysA and subsysB
    subsysA -> redirectParams();
    subsysB -> redirectParams();

    subsysB -> getParams(plistAB, x);
    subsysA -> getParams(plistAB, x);
    subsysB -> setParams(plistAB, x);  // just to ensure that A and B are synchronized

    subsysB -> calcGrad(plistAB, grad);
    subsysA -> calcJacobi(plistAB, JA);
    subsysA -> calcResidual(resA);

    double convergence = isFine ? XconvergenceFine : XconvergenceRough;
    int maxIterNumber = MaxIterations * xsize;
    double divergingLim = 1e6 * subsysA -> error() + 1e12;

    double mu = 0;
    lambda.setZero();
    for (int iter = 1; iter < maxIterNumber; iter++) {
      int status = qp_eq(B, grad, JA, resA, xdir, Y, Z);
      if (status) {
        break;
      }

      x0 = x;
      lambda0 = lambda;
      lambda = Y.transpose() * (B * xdir + grad);
      lambdadir = lambda - lambda0;

      // line search
      {
        double eta = 0.25;
        double tau = 0.5;
        double rho = 0.5;
        double alpha = 1;
        alpha = std::min (alpha, subsysA -> maxStep(plistAB, xdir));

        // Eq. 18.32
        // double mu = lambda.lpNorm<Eigen::Infinity>() + 0.01;
        // Eq. 18.33
        // double mu =  grad.dot(xdir) / ( (1.-rho) * resA.lpNorm<1>());
        // Eq. 18.36
        mu = std::max (mu,
              (grad.dot(xdir) + std::max (0., 0.5 * xdir.dot(B * xdir)))/
        ((1. - rho) * resA.lpNorm < 1 > ()));

        // Eq. 18.27
        double f0 = subsysB -> error() + mu * resA.lpNorm < 1 > ();

        // Eq. 18.29
        double deriv = grad.dot(xdir) - mu * resA.lpNorm < 1 > ();

        x = x0 + alpha * xdir;
        subsysA -> setParams(plistAB, x);
        subsysB -> setParams(plistAB, x);
        subsysA -> calcResidual(resA);
        double f = subsysB -> error() + mu * resA.lpNorm < 1 > ();

        // line search, Eq. 18.28
        bool first = true;
        while (f > f0 + eta * alpha * deriv) {
          if (first) { // try a second order step
//                    xdir1 = JA.jacobiSvd(Eigen::ComputeThinU |
//                                         Eigen::ComputeThinV).solve(-resA);
            xdir1 = -Y * resA;
            x += xdir1; // = x0 + alpha * xdir + xdir1
            subsysA -> setParams(plistAB, x);
            subsysB -> setParams(plistAB, x);
            subsysA -> calcResidual(resA);
            f = subsysB -> error() + mu * resA.lpNorm < 1 > ();
            if (f < f0 + eta * alpha * deriv) {
              break;
            }
          }
          alpha = tau * alpha;
          if (alpha < 1e-8) // let the linesearch fail
          {
            alpha = 0.;
          }
          x = x0 + alpha * xdir;
          subsysA -> setParams(plistAB, x);
          subsysB -> setParams(plistAB, x);
          subsysA -> calcResidual(resA);
          f = subsysB -> error() + mu * resA.lpNorm < 1 > ();
          if (alpha < 1e-8) // let the linesearch fail
          {
            break;
          }
        }
        lambda = lambda0 + alpha * lambdadir;

      }
      h = x - x0;

      y = grad - JA.transpose() * lambda;
      {
        subsysB -> calcGrad(plistAB, grad);
        subsysA -> calcJacobi(plistAB, JA);
        subsysA -> calcResidual(resA);
      }
      y = grad - JA.transpose() * lambda - y; // Eq. 18.13

      if (iter > 1) {
        double yTh = y.dot(h);
        if (yTh != 0) {
          Bh = B * h;
          //Now calculate the BFGS update on B
          B += 1. / yTh * y * y.transpose();
          B -= 1. / h.dot(Bh) * (Bh * Bh.transpose());
        }
      }

      double err = subsysA -> error();
      if (h.norm() <= convergence && err <= smallF) {
        break;
      }
      if (err > divergingLim || err != err) // check for diverging and NaN
      {
        break;
      }
    }

    int ret;
    if (subsysA -> error() <= smallF) {
      ret = Success;
    } else if (h.norm() <= convergence) {
      ret = Converged;
    } else {
      ret = Failed;
    }

    subsysA -> revertParams();
    subsysB -> revertParams();
    return ret;

  }

  void applySolution() {
    for (int cid = 0; cid <int(subSystems.size());
    cid++){
      if (subSystemsAux.get(cid)) {
        subSystemsAux.get(cid)
      }->applySolution();
      if (subSystems.get(cid)) {
        subSystems.get(cid)
      }->applySolution();
      for (MAP_pD_pD::const_iterator it = reductionmaps.get(cid).begin();
           it != reductionmaps.get(cid).end() ;
      ++it)
      *(it -> first) =*(it -> second);
    }
  }

  void undoSolution() {
    resetToReference();
  }

  int diagnose() {
    // Analyses the constrainess grad of the system and provides feedback
    // The vector "conflictingTags" will hold a group of conflicting constraints

    // Hint 1: Only constraints with tag >= 0 are taken into account
    // Hint 2: Constraints tagged with 0 are treated as high priority
    //         constraints and they are excluded from the returned
    //         list of conflicting constraints. Therefore, this function
    //         will provide no feedback about possible conflicts between
    //         two high priority constraints. For this reason, tagging
    //         constraints with 0 should be used carefully.
    hasDiagnosis = false;
    if (!hasUnknowns) {
      dofs = -1;
      return dofs;
    }

    redundant.clear();
    conflictingTags.clear();
    redundantTags.clear();
    Eigen::MatrixXd J(clist.size(), plist.size());
    int count = 0;
    for (std::vector < Constraint * >::iterator constr = clist.begin();
    constr != clist.end();
    ++constr){
      ( * constr)->revertParams();
      if (( * constr)->getTag() >= 0){
        count++;
        for (int j = 0; j <int(plist.size());
        j++)
        J(count - 1, j) = ( * constr)->grad(plist[j]);
      }
    }

    if (J.rows() > 0) {
      Eigen::FullPivHouseholderQR < Eigen::MatrixXd > qrJT(J.topRows(count).transpose());
      Eigen::MatrixXd Q = qrJT.matrixQ();
      int paramsNum = qrJT.rows();
      int constrNum = qrJT.cols();
      int rank = qrJT.rank();

      Eigen::MatrixXd R;
      if (constrNum >= paramsNum) {
        R = qrJT.matrixQR().triangularView < Eigen::Upper > ();
      } else {
        R = qrJT.matrixQR().topRows(constrNum)
                .triangularView < Eigen::Upper > ();
      }

      if (constrNum > rank) { // conflicting or redundant constraints
        for (int i = 1; i < rank; i++) {
          // eliminate non zeros above pivot
          assert (R(i, i) != 0);
          for (int row = 0; row < i; row++) {
            if (R(row, i) != 0) {
              double coef = R(row, i) / R(i, i);
              R.block(row, i + 1, 1, constrNum - i - 1) -= coef * R.block(i, i + 1, 1, constrNum - i - 1);
              R(row, i) = 0;
            }
          }
        }
        std::vector < std::vector < Constraint * >>conflictGroups(constrNum - rank);
        for (int j = rank; j < constrNum; j++) {
          for (int row = 0; row < rank; row++) {
            if (fabs(R(row, j)) > 1e-10) {
              int origCol = qrJT.colsPermutation().indices()[row];
              conflictGroups[j - rank].push_back(clist[origCol]);
            }
          }
          int origCol = qrJT.colsPermutation().indices()[j];
          conflictGroups[j - rank].push_back(clist[origCol]);
        }

        // try to remove the conflicting constraints and solve the
        // system in order to check if the removed constraints were
        // just redundant but not really conflicting
        std::set < Constraint * > skipped;
        SET_I satisfiedGroups;
        while (1) {
          std::map < Constraint *, SET_I > conflictingMap;
          for (int i = 0; i < conflictGroups.size(); i++) {
            if (satisfiedGroups.count(i) == 0) {
              for (int j = 0; j < conflictGroups[i].size(); j++) {
                Constraint * constr = conflictGroups[i][j];
                if (constr -> getTag() != 0) // exclude constraints tagged with zero
                {
                  conflictingMap[constr].insert(i);
                }
              }
            }
          }
          if (conflictingMap.empty()) {
            break;
          }

          int maxPopularity = 0;
          Constraint * mostPopular = NULL;
          for (std::map < Constraint *, SET_I >::const_iterator it = conflictingMap.begin();
          it != conflictingMap.end();
          it++){
            if (it -> second.size() > maxPopularity ||
                    (it -> second.size() == maxPopularity && mostPopular &&
                            it -> first -> getTag() > mostPopular -> getTag())) {
              mostPopular = it -> first;
              maxPopularity = it -> second.size();
            }
          }
          if (maxPopularity > 0) {
            skipped.insert(mostPopular);
            for (SET_I::const_iterator it = conflictingMap[mostPopular].begin();
                 it != conflictingMap[mostPopular].end() ;
            it++)
            satisfiedGroups.insert( * it);
          }
        }

        std::vector < Constraint * > clistTmp;
        clistTmp.reserve(clist.size());
        for (std::vector < Constraint * >::iterator constr = clist.begin();
        constr != clist.end();
        ++constr)
        if (skipped.count( * constr)==0)
        clistTmp.push_back( * constr);

        SubSystem * subSysTmp = new SubSystem(clistTmp, plist);
        int res = solve(subSysTmp);
        if (res == Success) {
          subSysTmp -> applySolution();
          for (std::set < Constraint * >::const_iterator constr = skipped.begin();
          constr != skipped.end();
          constr++){
            double err = ( * constr)->error();
            if (err * err < XconvergenceFine) {
              redundant.insert( * constr
            });
          }
          resetToReference();

          std::vector < std::vector < Constraint * >>conflictGroupsOrig = conflictGroups;
          conflictGroups.clear();
          for (int i = conflictGroupsOrig.size() - 1; i >= 0; i--) {
            bool isRedundant = false;
            for (int j = 0; j < conflictGroupsOrig[i].size(); j++) {
              if (redundant.count(conflictGroupsOrig[i][j]) > 0) {
                isRedundant = true;
                break;
              }
            }
            if (!isRedundant) {
              conflictGroups.push_back(conflictGroupsOrig[i]);
            } else {
              constrNum--;
            }
          }
        }
        delete subSysTmp;

        // simplified output of conflicting tags
        SET_I conflictingTagsSet;
        for (int i = 0; i < conflictGroups.size(); i++) {
          for (int j = 0; j < conflictGroups[i].size(); j++) {
            conflictingTagsSet.insert(conflictGroups[i][j]->getTag());
          }
        }
        conflictingTagsSet.erase(0); // exclude constraints tagged with zero
        conflictingTags.resize(conflictingTagsSet.size());
        std::copy (conflictingTagsSet.begin(), conflictingTagsSet.end(),
                conflictingTags.begin());

        // output of redundant tags
        SET_I redundantTagsSet;
        for (std::set < Constraint * >::iterator constr = redundant.begin();
        constr != redundant.end();
        ++constr)
        redundantTagsSet.insert(( * constr)->getTag());
        // remove tags represented at least in one non-redundant constraint
        for (std::vector < Constraint * >::iterator constr = clist.begin();
        constr != clist.end();
        ++constr)
        if (redundant.count( * constr)==0)
        redundantTagsSet.erase(( * constr)->getTag());
        redundantTags.resize(redundantTagsSet.size());
        std::copy (redundantTagsSet.begin(), redundantTagsSet.end(),
                redundantTags.begin());

        if (paramsNum == rank && constrNum > rank) { // over-constrained
          hasDiagnosis = true;
          dofs = paramsNum - constrNum;
          return dofs;
        }
      }

      hasDiagnosis = true;
      dofs = paramsNum - rank;
      return dofs;
    }
    hasDiagnosis = true;
    dofs = plist.size();
    return dofs;
  }

  void clearSubSystems() {
    isInit = false;
    free(subSystems);
    free(subSystemsAux);
    subSystems.clear();
    subSystemsAux.clear();
  }

  double lineSearch(SubSystem*subsys, Eigen::VectorXd&xdir) {
    double f1, f2, f3, alpha1, alpha2, alpha3, alphaStar;

    double alphaMax = subsys -> maxStep(xdir);

    Eigen::VectorXd x0, x;

    //Save initial values
    subsys -> getParams(x0);

    //Start at the initial position alpha1 = 0
    alpha1 = 0.;
    f1 = subsys -> error();

    //Take a step of alpha2 = 1
    alpha2 = 1.;
    x = x0 + alpha2 * xdir;
    subsys -> setParams(x);
    f2 = subsys -> error();

    //Take a step of alpha3 = 2*alpha2
    alpha3 = alpha2 * 2;
    x = x0 + alpha3 * xdir;
    subsys -> setParams(x);
    f3 = subsys -> error();

    //Now reduce or lengthen alpha2 and alpha3 until the minimum is
    //Bracketed by the triplet f1>f2<f3
    while (f2 > f1 || f2 > f3) {
      if (f2 > f1) {
        //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
        //Effectively both are shortened by a factor of two.
        alpha3 = alpha2;
        f3 = f2;
        alpha2 = alpha2 / 2;
        x = x0 + alpha2 * xdir;
        subsys -> setParams(x);
        f2 = subsys -> error();
      } else if (f2 > f3) {
        if (alpha3 >= alphaMax) {
          break;
        }
        //If f2 is greater than f3 then we increase alpha2 and alpha3 away from f1
        //Effectively both are lengthened by a factor of two.
        alpha2 = alpha3;
        f2 = f3;
        alpha3 = alpha3 * 2;
        x = x0 + alpha3 * xdir;
        subsys -> setParams(x);
        f3 = subsys -> error();
      }
    }
    //Get the alpha for the minimum f of the quadratic approximation
    alphaStar = alpha2 + ((alpha2 - alpha1) * (f1 - f3)) / (3 * (f1 - 2 * f2 + f3));

    //Guarantee that the new alphaStar is within the bracket
    if (alphaStar >= alpha3 || alphaStar <= alpha1) {
      alphaStar = alpha2;
    }

    if (alphaStar > alphaMax) {
      alphaStar = alphaMax;
    }

    if (alphaStar != alphaStar) {
      alphaStar = 0.;
    }

    //Take a final step to alphaStar
    x = x0 + alphaStar * xdir;
    subsys -> setParams(x);

    return alphaStar;
  }


} //namespace GCS
