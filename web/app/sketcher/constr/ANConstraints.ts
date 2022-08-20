import {Param} from '../shapes/param';
import {DEG_RAD, makeAngle0_360} from "math/commons";
import {COS_FN, Polynomial, POW_1_FN, POW_2_FN, POW_3_FN, SIN_FN} from "./polynomial";

import {cubicBezierDer1, cubicBezierDer2, cubicBezierPoint} from "geom/curves/bezierCubic";
import {greaterThanConstraint, lessThanConstraint} from "./barriers";
import {genericCurveStep} from "geom/impl/nurbs-ext";
import {_normalize} from "math/vec";
import {
  AngleBetweenConstraintIcon,
  AngleConstraintIcon,
  CoincidentConstraintIcon,
  DistanceConstraintIcon,
  DistancePLConstraintIcon,
  EqualConstraintIcon,
  FilletConstraintIcon,
  GenericConstraintIcon,
  HorizontalConstraintIcon,
  LockConstraintIcon,
  ParallelConstraintIcon,
  PerpendicularConstraintIcon,
  PointInMiddleConstraintIcon,
  PointOnCurveConstraintIcon,
  PointOnLineConstraintIcon,
  RadiusConstraintIcon,
  SymmetryConstraintIcon,
  TangentConstraintIcon,
  VerticalConstraintIcon
} from "../icons/constraints/ConstraintIcons";
import {
  AngleAbsoluteAnnotation,
  AngleBetweenAnnotation,
  LengthAnnotation,
  RadiusLengthAnnotation
} from "../shapes/annotations/angleAnnotation";
import {ISolveStage, SolvableObject} from "./solvableObject";
import {SketchObject} from "../shapes/sketch-object";
import {IconType} from "react-icons";
import {ConstraintAnnotation} from "./constraintAnnotation";
import {distanceAB} from "math/distance";

export const ConstraintDefinitions
  // : {
  //   [key: string]: ConstraintSchema
  // }
= {

  PCoincident : {
    id: 'PCoincident',
    name: 'Two Points Coincidence',
    icon: CoincidentConstraintIcon,

    defineParamsScope: ([p1, p2], callback) => {
      p1.visitParams(callback);
      p2.visitParams(callback);
    },


    collectPolynomials: (polynomials, [x1, y1, x2, y2]) => {
      polynomials.push(new Polynomial(0)
        .monomial(1)
        .term(x1, POW_1_FN)
        .monomial(-1)
        .term(x2, POW_1_FN)
      );
      polynomials.push(new Polynomial(0)
        .monomial(1)
        .term(y1, POW_1_FN)
        .monomial(-1)
        .term(y2, POW_1_FN)
      );
    },
  },


  TangentLC: {
    id: 'TangentLC',
    name: 'Line & Circle Tangency',
    icon: TangentConstraintIcon,

    constants: {
      inverted: {
        type: 'boolean',
        description: 'whether the circle attached from the opposite side',
        initialValue: ([line, circle]) => {
          return line.nx * circle.c.x + line.ny * circle.c.y < line.w;
        }
      }
    },

    defineParamsScope: ([segment, circle], callback) => {
      callback(segment.params.ang);
      segment.a.visitParams(callback);
      circle.c.visitParams(callback);
      callback(circle.r);
    },


    collectPolynomials: (polynomials, [ang, ax, ay, cx, cy, r], {inverted}) => {
      polynomials.push(tangentLCPolynomial(ang, ax, ay, cx, cy, r, inverted));
    },
  },

  PointOnLine: {
    id: 'PointOnLine',
    name: 'Point On Line',
    icon: PointOnLineConstraintIcon,

    defineParamsScope: ([pt, segment], callback) => {
      pt.visitParams(callback);
      segment.a.visitParams(callback);
      callback(segment.params.ang);
    },

    collectPolynomials: (polynomials, [x, y, ax, ay, ang]) => {
      polynomials.push(new Polynomial(0)
        .monomial(-1)
          .term(x, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(1)
          .term(y, POW_1_FN)
          .term(ang, COS_FN)
        .monomial(1)
          .term(ax, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(-1)
          .term(ay, POW_1_FN)
          .term(ang, COS_FN)
      );
    },

  },

  PointOnCircle: {
    id: 'PointOnCircle',
    name: 'Point On Circle',
    icon: PointOnCurveConstraintIcon,

    defineParamsScope: ([pt, circle], callback) => {
      pt.visitParams(callback);
      circle.c.visitParams(callback);
      callback(circle.r);
    },

    collectPolynomials: (polynomials, [x1, y1, x2, y2, r]) => {
      polynomials.push(new Polynomial()
        .monomial(-1)
          .term(r, POW_2_FN)
        .monomial(1)
          .term(x1, POW_2_FN)
        .monomial(1)
          .term(x2, POW_2_FN)
        .monomial(-2)
          .term(x1, POW_1_FN)
          .term(x2, POW_1_FN)

        .monomial(1)
          .term(y1, POW_2_FN)
        .monomial(1)
          .term(y2, POW_2_FN)
        .monomial(-2)
          .term(y1, POW_1_FN)
          .term(y2, POW_1_FN)

      );
    },

  },

  PointOnBezier: {
    id: 'PointOnBezier',
    name: 'Point On Bezier Curve',
    icon: PointOnCurveConstraintIcon,

    initialGuess: ([p0x,p0y, p3x,p3y, p1x,p1y, p2x,p2y, t, px, py]) => {
      const _t = t.get();
      if (_t < 0.001) {
        t.set(0);
      }
      if (_t > 0.999) {
        t.set(1);
      }
    },

    defineParamsScope: ([pt, curve], callback) => {
      const t = new Param(0.5, 't');
      t.constraints = [greaterThanConstraint(0), lessThanConstraint(1)];
      curve.visitParams(callback);
      callback(t);
      pt.visitParams(callback);
    },

    collectPolynomials: (polynomials, [p0x,p0y, p3x,p3y, p1x,p1y, p2x,p2y, t, px, py]) => {
      polynomials.push(bezier3Polynomial(px, t, p0x, p1x, p2x, p3x));
      polynomials.push(bezier3Polynomial(py, t, p0y, p1y, p2y, p3y));
    },

  },

  TangentLineBezier: {
    id: 'TangentLineBezier',
    name: 'Line & Bezier Tangency',
    icon: TangentConstraintIcon,

    initialGuess([p0x,p0y, p3x,p3y, p1x,p1y, p2x,p2y, _t, px,py, nx,ny, _ang, ax,ay]) {
      const ang = _ang.get();
      const p0 = [p0x.get(), p0y.get(), 0];
      const p1 = [p1x.get(),p1y.get(), 0];
      const p2 = [p2x.get(),p2y.get(), 0];
      const p3 = [p3x.get(),p3y.get(), 0];

      let t = 0;
      let bestT = 0.5;
      let best = -1;
      while (t <= 1) {

        const d1 = cubicBezierDer1(p0, p1, p2, p3, t);
        const d2 = cubicBezierDer2(p0, p1, p2, p3, t);

        t = Math.min(1, t + (genericCurveStep(d1, d2)||0.1));
        _normalize(d2);

        const measure = Math.abs(d1[0] * Math.cos(ang) + d1[1] * Math.sin(ang));
        if (measure > best) {
          best = measure;
          bestT = t;
        }

        if (t === 1) {
          break;
        }
      }

      //otherwise it gets stuck in the straight areas
      if (Math.abs(bestT - _t.get()) < 0.2) {
        return;
      }

      _t.set(bestT);
      const [_px, _py] = cubicBezierPoint(p0, p1, p2, p3, bestT);
      const [_nx, _ny] = cubicBezierDer1(p0, p1, p2, p3, bestT);
      px.set(_px);
      py.set(_py);

      nx.set(_nx);
      ny.set(_ny);
    },

    defineParamsScope: ([segment, curve], callback) => {
      const t0 = new Param(0.5, 't');
      t0.constraints = [greaterThanConstraint(0), lessThanConstraint(1)];

      curve.visitParams(callback);
      callback(t0);
      callback(new Param(0, 'X'));
      callback(new Param(0, 'Y'));
      callback(new Param(0, 'X'));
      callback(new Param(0, 'Y'));
      callback(segment.params.ang);
      segment.a.visitParams(callback);
    },

    collectPolynomials: (polynomials, [p0x,p0y, p3x,p3y, p1x,p1y, p2x,p2y, t, px,py, nx,ny, ang, ax,ay]) => {
      polynomials.push(bezier3Polynomial(px, t, p0x, p1x, p2x, p3x));
      polynomials.push(bezier3Polynomial(py, t, p0y, p1y, p2y, p3y));
      //expanded second derivative: -6 P0 t + 6 P0 + 18 P1 t - 12 P1 - 18 P2 t + 6 P2 + 6 P3 t
      const bzCubeD2 = (p, t, p0, p1, p2, p3) => new Polynomial()
        .monomial(-6)
          .term(p0, POW_1_FN)
          .term(t, POW_1_FN)
        .monomial(6)
          .term(p0, POW_1_FN)
        .monomial(18)
          .term(p1, POW_1_FN)
          .term(t, POW_1_FN)
        .monomial(-12)
          .term(p1, POW_1_FN)
        .monomial(-18)
          .term(p2, POW_1_FN)
          .term(t, POW_1_FN)
        .monomial(6)
          .term(p2, POW_1_FN)
        .monomial(6)
          .term(p3, POW_1_FN)
          .term(t, POW_1_FN)
      .monomial(-1)
          .term(p, POW_1_FN);
      //expanded first derivative: -3 P0 t^2 + 6 P0 t - 3 P0 + 9 P1 t^2 - 12 P1 t + 3 P1 - 9 P2 t^2 + 6 P2 t + 3 P3 t^2
      const bzCubeD1 = (p, t, p0, p1, p2, p3) => new Polynomial()
        .monomial(-3)
        .term(p0, POW_1_FN)
        .term(t, POW_2_FN)
        .monomial(6)
        .term(p0, POW_1_FN)
        .term(t, POW_1_FN)
        .monomial(-3)
        .term(p0, POW_1_FN)
        .monomial(9)
        .term(p1, POW_1_FN)
        .term(t, POW_2_FN)
        .monomial(-12)
        .term(p1, POW_1_FN)
        .term(t, POW_1_FN)
        .monomial(3)
        .term(p1, POW_1_FN)
        .monomial(-9)
        .term(p2, POW_1_FN)
        .term(t, POW_2_FN)
        .monomial(6)
        .term(p2, POW_1_FN)
        .term(t, POW_1_FN)
        .monomial(3)
        .term(p3, POW_1_FN)
        .term(t, POW_2_FN)
        .monomial(-1)
        .term(p, POW_1_FN);


      polynomials.push(bzCubeD1(nx, t, p0x, p1x, p2x, p3x));
      polynomials.push(bzCubeD1(ny, t, p0y, p1y, p2y, p3y));
      polynomials.push(new Polynomial()
        .monomial(-1)
          .term(ny, POW_1_FN)
          .term(ang, COS_FN)
        .monomial()
          .term(nx, POW_1_FN)
          .term(ang, SIN_FN)
      );
      ConstraintDefinitions.PointOnLine.collectPolynomials(polynomials, [px, py, ax, ay, ang]);
    },

  },

  PointOnEllipse: {
    id: 'PointOnEllipse',
    name: 'Point On Ellipse',
    icon: PointOnCurveConstraintIcon,

    defineParamsScope: ([pt, ellipse], callback) => {
      pt.visitParams(callback);
      ellipse.visitParams(callback);
      callback(new Param(Math.atan2(pt.y - ellipse.c.y, pt.x - ellipse.c.x), 't'));
    },

    collectPolynomials: (polynomials, [px,py, cx,cy, rx,ry, rot, t]) => {

      polynomials.push(new Polynomial()
        .monomial(-1)
          .term(px, POW_1_FN)
        .monomial()
          .term(cx, POW_1_FN)
        .monomial()
          .term(rx, POW_1_FN)
          .term(rot, COS_FN)
          .term(t, COS_FN)
        .monomial(-1)
          .term(ry, POW_1_FN)
          .term(rot, SIN_FN)
          .term(t, SIN_FN)
      );

      polynomials.push(new Polynomial()
        .monomial(-1)
          .term(py, POW_1_FN)
        .monomial()
          .term(cy, POW_1_FN)
        .monomial()
          .term(rx, POW_1_FN)
          .term(rot, SIN_FN)
          .term(t, COS_FN)
        .monomial()
          .term(ry, POW_1_FN)
          .term(rot, COS_FN)
          .term(t, SIN_FN)
      );

      // polynomials.push(ellipsePoly());
    },

  },

  PointInMiddle: {
    id: 'PointInMiddle',
    name: 'Middle Point',
    icon: PointInMiddleConstraintIcon,

    defineParamsScope: ([pt, segment], callback) => {
      segment.a.visitParams(callback);
      pt.visitParams(callback);
      segment.b.visitParams(callback);
    },

    collectPolynomials: (polynomials, [x1, y1, x2, y2, x3, y3]) => {
      polynomials.push(new Polynomial()
        .monomial(1)
         .term(x1, POW_2_FN)
        .monomial(-2)
         .term(x1, POW_1_FN)
          .term(x2, POW_1_FN)

        .monomial(1)
          .term(y1, POW_2_FN)

        .monomial(-2)
          .term(y1, POW_1_FN)
          .term(y2, POW_1_FN)

        .monomial(-1)
          .term(x3, POW_2_FN)
        .monomial(2)
          .term(x3, POW_1_FN)
          .term(x2, POW_1_FN)

        .monomial(-1)
         .term(y3, POW_2_FN)

        .monomial(2)
         .term(y3, POW_1_FN)
         .term(y2, POW_1_FN)
      );
    },
  },

  Symmetry: {
    id: 'Symmetry',
    name: 'Symmetry',
    icon: SymmetryConstraintIcon,

    defineParamsScope: ([pt, segment], callback) => {
      segment.a.visitParams(callback);
      pt.visitParams(callback);
      segment.b.visitParams(callback);
      callback(segment.params.ang);
    },

    collectPolynomials: (polynomials, [x1, y1, x2, y2, x3, y3, ang]) => {
      ConstraintDefinitions.PointInMiddle.collectPolynomials(polynomials, [x1, y1, x2, y2, x3, y3]);
      ConstraintDefinitions.PointOnLine.collectPolynomials(polynomials, [x2, y2, x1, y1, ang]);
    },
  },

  DistancePP: {
    id: 'DistancePP',
    name: 'Distance Between Two Point',
    icon: DistanceConstraintIcon,

    constants: {
      distance: {
        type: 'number',
        description: 'the distance between two points',
        initialValue: ([a, b]) => {
          return distanceAB(a, b);
        },
      }
    },

    defineParamsScope: ([pt1, pt2], callback) => {
      pt1.visitParams(callback);
      pt2.visitParams(callback);
    },

    collectPolynomials: (polynomials, [x1, y1, x2, y2], {distance}) => {
      polynomials.push(new Polynomial( - distance * distance)
        .monomial(1)
          .term(x1, POW_2_FN)
        .monomial(1)
          .term(x2, POW_2_FN)
        .monomial(-2)
          .term(x1, POW_1_FN)
          .term(x2, POW_1_FN)

        .monomial(1)
          .term(y1, POW_2_FN)
        .monomial(1)
          .term(y2, POW_2_FN)
        .monomial(-2)
          .term(y1, POW_1_FN)
          .term(y2, POW_1_FN)

      );
    },

  },

  DistancePL: {
    id: 'DistancePL',
    name: 'Distance Between Point And Line',
    icon: DistancePLConstraintIcon,

    constants: {
      distance: {
        type: 'number',
        description: 'the distance between two points',
        initialValue: ([p, l]) => {
          return Math.abs(l.nx * p.x + l.ny* p.y - l.nx * l.a.x - l.ny * l.a.y);
        },
      },
      inverted: {
        type: 'boolean',
        description: 'whether constraint is being calculated on opposite side of the line',
        initialValue: ([p, l]) => {
          return l.nx * p.x + l.ny* p.y - l.nx * l.a.x - l.ny * l.a.y < 0;
        },
      }

    },

    defineParamsScope: ([p, l], callback) => {
      p.visitParams(callback);
      callback(l.params.ang);
      l.a.visitParams(callback);
    },

    collectPolynomials: (polynomials, [x, y, ang, ax, ay], {distance, inverted}) => {
      polynomials.push(new Polynomial( - (inverted ? -1:1) * distance )
        .monomial(-1)
          .term(x, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(1)
          .term(y, POW_1_FN)
          .term(ang, COS_FN)
        .monomial(1)
          .term(ax, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(-1)
          .term(ay, POW_1_FN)
          .term(ang, COS_FN));
    },

  },

  Angle: {
    id: 'Angle',
    name: 'Absolute Line Angle',
    icon: AngleConstraintIcon,

    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: ([seg]) => seg.getAngleFromNormal(),
        transform: degree => ( (degree) % 360 ) * DEG_RAD
      }
    },

    defineParamsScope: ([segment], callback) => {
      callback(segment.params.ang);
    },

    collectPolynomials: (polynomials, [x], {angle}) => {
      polynomials.push(new Polynomial( - angle).monomial(1).term(x, POW_1_FN));
    },

    setConstantsFromGeometry: ([seg], constants) => {
      constants.angle = seg.getAngleFromNormal();
    },

    createAnnotations: ([segment], constraintInstance) => {
      return [new AngleAbsoluteAnnotation(segment, constraintInstance)];
    }
  },

  Vertical: {
    id: 'Vertical',
    name: 'Line Verticality',
    icon: VerticalConstraintIcon,

    constants: {
      angle: {
        readOnly: true,
        type: 'number',
        description: 'line angle',
        initialValue: ([seg]) => {
          const angleFromNormal = seg.angleDeg();
          return Math.abs(270 - angleFromNormal) > Math.abs(90 - angleFromNormal) ? 90 : 270;
        },
        transform: degree => degree * DEG_RAD
      }
    },

    defineParamsScope: (objs, cb) => {
      ConstraintDefinitions.Angle.defineParamsScope(objs, cb);
    },

    collectPolynomials: (polynomials, params, constants) => {
      ConstraintDefinitions.Angle.collectPolynomials(polynomials, params, constants);
    }
  },

  Horizontal: {
    id: 'Horizontal',
    name: 'Line Horizontality',
    icon: HorizontalConstraintIcon,

    constants: {
      angle: {
        readOnly: true,
        type: 'number',
        description: 'line angle',
        initialValue: ([seg]) => {
          const ang = seg.angleDeg();
          return Math.abs(180 - ang) > Math.min(Math.abs(360 - ang), Math.abs(0 - ang)) ? 0 : 180;
        },
        transform: degree => degree * DEG_RAD
      }
    },

    defineParamsScope: (objs, cb) => {
      ConstraintDefinitions.Angle.defineParamsScope(objs, cb);
    },

    collectPolynomials: (polynomials, params, constants) => {
      ConstraintDefinitions.Angle.collectPolynomials(polynomials, params, constants);
    }
  },

  AngleBetween: {
    id: 'AngleBetween',
    name: 'Angle Between Two Lines',
    icon: AngleBetweenConstraintIcon,

    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: ([segment1, segment2]) => {
          const a1 = segment1.params.ang.get();
          const a2 = segment2.params.ang.get();

          return makeAngle0_360(a2 - a1) / DEG_RAD;
        },
        transform: degree => degree * DEG_RAD
      }
    },

    defineParamsScope: ([segment1, segment2], callback) => {
      callback(segment1.params.ang);
      callback(segment2.params.ang);
    },

    collectPolynomials: (polynomials, [x1, x2], {angle}) => {
      polynomials.push(new Polynomial( - angle).monomial(1).term(x2, POW_1_FN).monomial(-1).term(x1, POW_1_FN));
    },

    createAnnotations: ([segment1, segment2], constraintInstance) => {
      return [new AngleBetweenAnnotation(segment1, segment2, constraintInstance)];
    }
  },

  Perpendicular: {
    id: 'Perpendicular',
    name: 'Perpendicular',
    icon: PerpendicularConstraintIcon,

    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        readOnly: true,
        initialValue: ([segment1, segment2]) => {
          const a1 = segment1.params.ang.get();
          const a2 = segment2.params.ang.get();
          const deg = makeAngle0_360(a2 - a1);
          return Math.abs(270 - deg) > Math.abs(90 - deg) ? 90 : 270;
        },
        transform: degree => degree * DEG_RAD
      }
    },

    defineParamsScope: (objs, cb) => {
      ConstraintDefinitions.AngleBetween.defineParamsScope(objs, cb);
    },

    collectPolynomials: (polynomials, params, constants) => {
      ConstraintDefinitions.AngleBetween.collectPolynomials(polynomials, params, constants);
    }

  },

  Parallel: {
    id: 'Parallel',
    name: 'Parallel',
    icon: ParallelConstraintIcon,

    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: ([segment1, segment2]) => {
          const a1 = segment1.params.ang.get();
          const a2 = segment2.params.ang.get();
          const ang = makeAngle0_360(a2 - a1);
          return Math.abs(180 - ang) > Math.min(Math.abs(360 - ang), Math.abs(0 - ang)) ? 180 : 0;
        },
        transform: degree => degree * DEG_RAD,
        presentation: {
          label: 'flip',
          type: 'boolean',
          transformOut: value => value === '180',
          transformIn: value => value ? '180' : '0',
        }
      },
    },

    defineParamsScope: (objs, cb) => {
      ConstraintDefinitions.AngleBetween.defineParamsScope(objs, cb);
    },

    collectPolynomials: (polynomials, params, constants) => {
      ConstraintDefinitions.AngleBetween.collectPolynomials(polynomials, params, constants);
    }

  },


  SegmentLength: {
    id: 'SegmentLength',
    name: 'Segment Length',
    icon: DistanceConstraintIcon,

    constants: {
      length: {
        type: 'number',
        description: 'length of the segment',
        initialValue: ([segment]) => {
          const dx = segment.b.x - segment.a.x;
          const dy = segment.b.y - segment.a.y;
          return Math.sqrt(dx*dx + dy*dy);
        },

        // transform: length => length * length
      }
    },

    defineParamsScope: ([segment], callback) => {
      callback(segment.params.t);
    },

    collectPolynomials: (polynomials, [t], {length}) => {
      polynomials.push(new Polynomial( - length).monomial(1).term(t, POW_1_FN));
    },

    setConstantsFromGeometry: ([segment], constants) => {
      const dx = segment.b.x - segment.a.x;
      const dy = segment.b.y - segment.a.y;
      constants.length = Math.sqrt(dx*dx + dy*dy);
    },

    createAnnotations: ([segment], constraintInstance) => {
      return [new LengthAnnotation(segment, constraintInstance)];
    }
  },


  RadiusLength: {
    id: 'RadiusLength',
    name: 'Radius Length',
    icon: RadiusConstraintIcon,

    constants: {
      length: {
        type: 'number',
        description: 'length of the radius',
        initialValue: ([c]) => {
          return c.r.get();
        },
      },
    },
    defineParamsScope: ([c], callback) => {
      callback(c.r);
    },

    collectPolynomials: (polynomials, [r], {length}) => {
      polynomials.push(new Polynomial(-length).monomial(1).term(r, POW_1_FN));
    },


    createAnnotations: ([segment], constraintInstance) => {
      return [new RadiusLengthAnnotation(segment, constraintInstance)];
    }
  },

  Polar: {
    id: 'Polar',
    name: 'Polar Coordinate',

    defineParamsScope: ([segment, originPt, targetPt], callback) => {
      callback(segment.params.ang);
      callback(segment.params.t);
      originPt.visitParams(callback);
      targetPt.visitParams(callback);
    },

    collectPolynomials: (polynomials, [ang, t, x1, y1, x2, y2]) => {
      polynomials.push(new Polynomial().monomial(1).term(x1, POW_1_FN).monomial(1).term(ang, COS_FN).term(t, POW_1_FN).monomial(-1).term(x2, POW_1_FN));
      polynomials.push(new Polynomial().monomial(1).term(y1, POW_1_FN).monomial(1).term(ang, SIN_FN).term(t, POW_1_FN).monomial(-1).term(y2, POW_1_FN));
    },
  },

  EqualRadius: {
    id: 'EqualRadius',
    name: 'Equal Radius',
    icon: EqualConstraintIcon,

    defineParamsScope: ([c1, c2], callback) => {
      callback(c1.r);
      callback(c2.r);
    },

    collectPolynomials: (polynomials, [r1, r2]) => {
      polynomials.push(new Polynomial().monomial().term(r1, POW_1_FN).monomial(-1).term(r2, POW_1_FN));
    },
  },

  EqualLength: {
    id: 'EqualLength',
    name: 'Equal Length',
    icon: EqualConstraintIcon,

    defineParamsScope: ([s1, s2], callback) => {
      callback(s1.params.t);
      callback(s2.params.t);
    },

    collectPolynomials: (polynomials, [t1, t2]) => {
      polynomials.push(new Polynomial().monomial().term(t1, POW_1_FN).monomial(-1).term(t2, POW_1_FN));
    },
  },

  LockPoint: {
    id: 'LockPoint',
    name: 'Lock Point',
    icon: LockConstraintIcon,

    constants: {
      x: {
        type: 'number',
        description: 'X Coordinate',
        initialValue: ([pt]) => pt.x,
      },
      y: {
        type: 'number',
        description: 'y Coordinate',
        initialValue: ([pt]) => pt.y,
      }
    },

    defineParamsScope: ([pt], callback) => {
      pt.visitParams(callback);
    },

    collectPolynomials: (polynomials, [px, py], {x, y}: ResolvedConstants) => {
      polynomials.push(new Polynomial(-x).monomial().term(px, POW_1_FN));
      polynomials.push(new Polynomial(-y).monomial().term(py, POW_1_FN));
    },

    setConstantsFromGeometry: ([pt], constants: ConstantsDefinitions) => {
      constants.x = pt.x + '';
      constants.y = pt.y + '';
    }
  },

  ArcConsistency: {
    id: 'ArcConsistency',
    name: 'Arc Consistency',
    icon: GenericConstraintIcon,

    defineParamsScope: ([arc], callback) => {
      arc.visitParams(callback);
    },

    collectPolynomials: (polynomials, [r, ang1, ang2, ax, ay, bx, by, cx, cy]) => {
      polynomials.push(new Polynomial()
        .monomial(-1).term(ax, POW_1_FN)
        .monomial().term(cx, POW_1_FN).monomial().term(r, POW_1_FN).term(ang1, COS_FN) );
      polynomials.push(new Polynomial()
        .monomial(-1).term(ay, POW_1_FN)
        .monomial().term(cy, POW_1_FN).monomial().term(r, POW_1_FN).term(ang1, SIN_FN) );

      polynomials.push(new Polynomial()
        .monomial(-1).term(bx, POW_1_FN)
        .monomial().term(cx, POW_1_FN).monomial().term(r, POW_1_FN).term(ang2, COS_FN) );
      polynomials.push(new Polynomial()
        .monomial(-1).term(by, POW_1_FN)
        .monomial().term(cy, POW_1_FN).monomial().term(r, POW_1_FN).term(ang2, SIN_FN) );
    },
  },

  Fillet: {
    id: 'Fillet',
    name: 'Fillet Between Two Lines',
    icon: FilletConstraintIcon,

    constants: {
      inverted1: {
        type: 'boolean',
        initialValue: () => false,
      },
      inverted2: {
        type: 'boolean',
        initialValue: () => false,
      }
    },

    defineParamsScope: ([l1, l2, arc], callback) => {
      callback(l1.params.ang);
      l1.a.visitParams(callback);
      callback(l2.params.ang);
      l2.a.visitParams(callback);
      arc.c.visitParams(callback);
      callback(arc.r);
    },

    collectPolynomials: (polynomials, [ang1, ax1, ay1, ang2, ax2, ay2, cx, cy, r], {inverted1, inverted2}) => {
      polynomials.push(tangentLCPolynomial(ang1, ax1, ay1, cx, cy, r, inverted1));
      polynomials.push(tangentLCPolynomial(ang2, ax2, ay2, cx, cy, r, inverted2));
    },

  },
};


function tangentLCPolynomial(ang, ax, ay, cx, cy, r, inverted) {
  return new Polynomial(0)
    .monomial(-1)
      .term(cx, POW_1_FN)
      .term(ang, SIN_FN)
    .monomial(1)
      .term(cy, POW_1_FN)
      .term(ang, COS_FN)
    .monomial(1)
      .term(ax, POW_1_FN)
      .term(ang, SIN_FN)
    .monomial(-1)
      .term(ay, POW_1_FN)
      .term(ang, COS_FN)
    .monomial(- (inverted ? -1 : 1))
      .term(r, POW_1_FN);
}

const bezier3Polynomial = (p, t, p0, p1, p2, p3) => new Polynomial()
  .monomial(-1)
    .term(t, POW_3_FN)
    .term(p0, POW_1_FN)
  .monomial(3)
    .term(t, POW_2_FN)
    .term(p0, POW_1_FN)
  .monomial(-3)
    .term(t, POW_1_FN)
    .term(p0, POW_1_FN)
  .monomial(1)
  .term(p0, POW_1_FN)

  .monomial(3)
    .term(t, POW_3_FN)
    .term(p1, POW_1_FN)
  .monomial(-6)
    .term(t, POW_2_FN)
    .term(p1, POW_1_FN)
  .monomial(3)
    .term(t, POW_1_FN)
    .term(p1, POW_1_FN)

  .monomial(-3)
    .term(t, POW_3_FN)
    .term(p2, POW_1_FN)
  .monomial(3)
    .term(t, POW_2_FN)
    .term(p2, POW_1_FN)

  .monomial(1)
    .term(t, POW_3_FN)
    .term(p3, POW_1_FN)

  .monomial(-1)
    .term(p, POW_1_FN);


export type ResolvedConstants = { [p: string]: any };
export type ConstantsDefinitions = { [p: string]: string };

export interface ConstraintSchema {

  id: string;
  name: string,
  icon?: IconType,
  constants?: {
    [name: string]: {
      readOnly?: boolean;
      type: string,
      description?: string,
      transform?: (string) => any,
      initialValue(objects: SolvableObject[]): any;
    }
  };

  createAnnotations?: (objects: SolvableObject[], constraintInstance: AlgNumConstraint) =>  ConstraintAnnotation<any>[];

  defineParamsScope: (object: SolvableObject[], cb: (param: Param) => void) => void;

  collectPolynomials(polynomials: Polynomial[], params: Param[], resolvedConstants: ResolvedConstants, objects: SolvableObject[]): void;

  setConstantsFromGeometry?: (object: SolvableObject[], resolvedConstants: ConstantsDefinitions) => void;

  initialGuess?(params: Param[], resolvedConstants: ResolvedConstants): void;
}

export class AlgNumConstraint {

  static Counter = 0;

  id: string;
  objects: SolvableObject[];
  constants: ConstantsDefinitions;
  resolvedConstants: ResolvedConstants;
  internal: boolean;
  schema: ConstraintSchema;
  params: Param[];
  stage: ISolveStage;
  annotations: ConstraintAnnotation<any>[];

  constructor(schema: ConstraintSchema, objects: SolvableObject[], constants?: ConstantsDefinitions, internal: boolean = false) {
    this.id = schema.id + ':' + (AlgNumConstraint.Counter ++); // only for debug purposes - not persisted
    this.objects = objects;
    this.constants = constants;
    this.resolvedConstants = undefined;
    this.internal = internal;
    this.schema = schema;
    this.params = [];
    this.stage = null;

    if (this.schema.defineParamsScope) {
      this.schema.defineParamsScope(this.objects, p => this.params.push(p));
    }

    if (!this.internal && this.schema.createAnnotations) {
      this.annotations = this.schema.createAnnotations(this.objects, this);
    } else {
      this.annotations = [];
    }
  }

  collectPolynomials(polynomials: Polynomial[]) {
    this.schema.collectPolynomials(polynomials, this.params, this.resolvedConstants, this.objects);
  }

  resolveConstants(expressionResolver) {
    if (this.constants) {
      if (!this.resolvedConstants) {
        this.resolvedConstants = {};
      }
      Object.keys(this.constants).map(name => {
        const def = this.schema.constants[name];
        let val: any = this.constants[name];
        val = expressionResolver(val);
        if (def.type === 'number') {
          val = parseFloat(val);
        } else if (def.type === 'boolean') {
          val = val === 'true' || val === true;
        }
        if (def.transform) {
          val = def.transform(val);
        }
        this.resolvedConstants[name] = val;
      });
    }
  }

  write(): ConstraintSerialization {
    return {
      typeId: this.schema.id,
      objects: this.objects.map(o => o.id),
      constants: this.constants,
      stage: this.stage&&this.stage.index,
      annotations: this.annotations.map(ann => ann.save())
    }
  }

  static read({typeId, objects, constants, annotations}: ConstraintSerialization, index: {[key: string]: SolvableObject}) {
    const schema = ConstraintDefinitions[typeId];
    if (!schema) {
      throw "constraint schema " + typeId + " doesn't exist";
    }
    const constraint = new AlgNumConstraint(schema, objects.map(oId => index[oId]), constants);
    if (annotations) {
      constraint.annotations.forEach((ann, i) => ann.load(annotations[i]));
    }
    return constraint;
  }

   initConstants() {
    if (this.schema.constants) {
      this.constants = {};
      this.constantKeys.map(name => {
        let val = this.schema.constants[name].initialValue(this.objects);
        if (typeof val === 'number') {
          val = val.toFixed(2);
        }
        this.updateConstant(name, val + '');
      });
    }
  }

  get editable() {
    if (!this.schema.constants) {
      return false;
    }
    const defs = Object.values(this.schema.constants);
    for (const cd of defs) {
      if (!cd.readOnly) {
        return true;
      }
    }
    return false;
  }

  setConstantsFromGeometry() {
    if (this.schema.setConstantsFromGeometry) {
      this.schema.setConstantsFromGeometry(this.objects, this.constants);
    }
  }

  initialGuess() {
    if (this.schema.initialGuess) {
      this.schema.initialGuess(this.params, this.resolvedConstants);
    }
  }

  get constantKeys() {
    return Object.keys(this.schema.constants);
  }

  updateConstant(key, value) {
    this.constants[key] = value + ''; // only string are allowed here
  }
}


export interface ConstraintSerialization {
  typeId: string;
  objects: string[];
  constants: ConstantsDefinitions;
  stage: number;
  annotations?: any
}