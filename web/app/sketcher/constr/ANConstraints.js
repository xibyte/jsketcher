import {R_DistancePP, R_Equal, R_PointOnLine} from "./residuals";
import {indexById} from "../../../../modules/gems/iterables";
import {DEG_RAD, distanceAB} from "../../math/math";
import {COS_FN, Polynomial, POW_1_FN, POW_2_FN, SIN_FN} from "./polynomial";
import {Types} from "../io";
import {Constraints} from "../constraints";
import Vector from "../../../../modules/math/vector";

export const ConstraintDefinitions = {

  PCoincident : {
    id: 'PCoincident',
    name: 'Two Points Coincidence',

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
    constants: {
      inverted: {
        type: 'boolean',
        description: 'whether the circle attached from the opposite side',
        initialValue: ({objects: [line, circle]}) => {
          const ang = line.params.ang.get();
          const w = line.params.w.get();
          return Math.cos(ang) * circle.c.x + Math.sin(ang) * circle.c.y < w;
        }
      }
    },

    defineParamsScope: ([segment, circle], callback) => {
      callback(segment.params.ang);
      callback(segment.params.w);
      circle.c.visitParams(callback);
      callback(circle.r);
    },


    collectPolynomials: (polynomials, [ang, w, cx, cy, r], {inverted}) => {
      polynomials.push(tangentLCPolynomial(ang, w, cx, cy, r, inverted));
    },
  },

  PointOnLine: {
    id: 'PointOnLine',
    name: 'Point On Line',

    defineParamsScope: ([pt, segment], callback) => {
      pt.visitParams(callback);
      callback(segment.params.ang);
      callback(segment.params.w);
    },

    collectResiduals: (residuals, params) => {
      residuals.push([R_PointOnLine, params, []]);
    },

    collectPolynomials: (polynomials, [x, y, ang, w]) => {
      polynomials.push(new Polynomial(0)
        .monomial(1)
          .term(x, POW_1_FN)
          .term(ang, COS_FN)
        .monomial(1)
          .term(y, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(-1)
          .term(w, POW_1_FN)
      );
    },

  },

  DistancePP: {
    id: 'DistancePP',
    name: 'Distance Between Two Point',
    constants: {
      distance: {
        type: 'number',
        description: 'the distance between two points',
        initialValue: (constraint) => {
          const [a, b] = constraint.objects;
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

  Angle: {
    id: 'Angle',
    name: 'Absolute Line Angle',
    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: (constraint) => {
          let degrees = constraint.objects[0].params.ang.get() / DEG_RAD;
          return (degrees + 360 - 90) % 360;
        },
        transform: degree => ( (degree + 90) % 360 ) * DEG_RAD
      }
    },

    defineParamsScope: ([segment], callback) => {
      callback(segment.params.ang);
    },

    collectPolynomials: (polynomials, [x], {angle}) => {
      polynomials.push(new Polynomial( - angle).monomial(1).term(x, POW_1_FN));
    },
  },

  AngleBetween: {
    id: 'AngleBetween',
    name: 'Angle Between Two Lines',
    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: (constraint) => {
          const [segment1, segment2] = constraint.objects;
          const a1 = segment1.params.ang.get();
          const a2 = segment2.params.ang.get();

          let degrees = (a2 - a1) / DEG_RAD;
          return (degrees + 360) % 360;
        },
        transform: degree => degree * DEG_RAD
      }
    },

    defineParamsScope: ([segment1, segment2], callback) => {
      callback(segment1.params.ang);
      callback(segment2.params.ang);
    },

    collectPolynomials: (polynomials, [x1, x2], {angle}) => {
      polynomials.push(new Polynomial( - angle).monomial(1).term(x1, POW_1_FN).monomial(-1).term(x2, POW_1_FN));
    },
  },

  SegmentLength: {
    id: 'SegmentLength',
    name: 'Segment Length',
    constants: {
      length: {
        type: 'number',
        description: 'length of the segment',
        initialValue: (constraint) => {
          const [segment] = constraint.objects;
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


      //  v = [sin(ang), - cos(ang)]
      //  v * t = pt2 -  pt1

      //sin(ang) * t  - x2 + x1
      //-cos(ang) * t  - y2 + y1

      polynomials.push(new Polynomial().monomial()  .term(ang, SIN_FN).term(t, POW_1_FN).monomial(-1).term(x2, POW_1_FN).monomial(1).term(x1, POW_1_FN));
      polynomials.push(new Polynomial().monomial(-1).term(ang, COS_FN).term(t, POW_1_FN).monomial(-1).term(y2, POW_1_FN).monomial(1).term(y1, POW_1_FN));
    },
  },

  EqualRadius: {
    id: 'EqualRadius',
    name: 'Equal Radius',

    defineParamsScope: ([c1, c2], callback) => {
      callback(c1.r);
      callback(c2.r);
    },

    collectPolynomials: (polynomials, [r1, r2]) => {
      polynomials.push(new Polynomial().monomial().term(r1, POW_1_FN).monomial(-1).term(r2, POW_1_FN).monomial(1));
    },
  },

  LockPoint: {
    id: 'LockPoint',
    name: 'Lock Point',
    constants: {
      x: {
        type: 'number',
        description: 'X Coordinate',
        initialValue: (constraint) => constraint.objects[0].x,
      },
      y: {
        type: 'number',
        description: 'y Coordinate',
        initialValue: (constraint) => constraint.objects[0].y,
      }
    },

    defineParamsScope: ([pt], callback) => {
      pt.visitParams(callback);
    },

    collectPolynomials: (polynomials, [px, py], {x, y}) => {
      polynomials.push(new Polynomial(-x).monomial().term(px, POW_1_FN));
      polynomials.push(new Polynomial(-y).monomial().term(py, POW_1_FN));
    },
  },

  ArcConsistency: {
    id: 'ArcConsistency',
    name: 'Arc Consistency',

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
      callback(l1.params.w);
      callback(l2.params.ang);
      callback(l2.params.w);
      arc.c.visitParams(callback);
      callback(arc.r);
    },

    collectPolynomials: (polynomials, [ang1, w1, ang2, w2, cx, cy, r], {inverted1, inverted2}) => {
      polynomials.push(tangentLCPolynomial(ang1, w1, cx, cy, r, inverted1));
      polynomials.push(tangentLCPolynomial(ang2, w2, cx, cy, r, inverted2));
    },

  },

  Mirror: {
    id: 'Mirror',
    name: 'Mirror Objects',

    modify: (referenceObjects, managedObjects) => {

      const reflectionLine = referenceObjects[0];

      const dir = new Vector();
      dir.set(-(reflectionLine.b.y - reflectionLine.a.y), reflectionLine.b.x - reflectionLine.a.x, 0)._normalize();

      for (let i = 0; i < managedObjects.length; i++) {
        let origin = reflectionLine.a.toVector();

        const pointMirroring = (x, y) => {
          let pt = new Vector(x, y, 0);
          let proj = dir.dot(pt.minus(origin));
          return dir.multiply(- proj * 2)._plus(pt);
        };

        referenceObjects[i+1].mirror(managedObjects[i], pointMirroring);
      }
    },

    referenceObjects: objects => objects.slice(0, (objects.length >> 1) + 1),
    managedObjects: objects => objects.slice((objects.length + 1) >> 1)

  }

};


function tangentLCPolynomial(ang, w, cx, cy, r, inverted) {
  return new Polynomial(0)
    .monomial(1)
      .term(cx, POW_1_FN)
      .term(ang, COS_FN)
    .monomial(1)
      .term(cy, POW_1_FN)
      .term(ang, SIN_FN)
    .monomial(-1)
      .term(w, POW_1_FN)
    .monomial(- (inverted ? -1 : 1))
      .term(r, POW_1_FN);
}

export class AlgNumConstraint {

  static Counter = 0;

  constructor(schema, objects, constants) {
    this.id = schema.id + ':' + (AlgNumConstraint.Counter ++); // only for debug purposes - not persisted
    this.objects = objects;
    this.constants = constants;
    this.resolvedConstants = undefined;
    this.internal = false;
    this.schema = schema;
    this.params = [];
    if (this.schema.defineParamsScope) {
      this.schema.defineParamsScope(this.objects, p => this.params.push(p));
    }

    this.modifier = this.schema.modify !== undefined;
    if (this.modifier) {
      this.referenceObjects = this.schema.referenceObjects(this.objects);
      this.managedObjects = this.schema.managedObjects(this.objects);
      this.managedObjects.forEach(o => {
        if (o.managedBy) {
          throw 'there can be only one managing modifier for an object';
        }
        o.managedBy = this;
      });
    }
  }

  modify() {
    this.resolveConstants();
    this.schema.modify(this.referenceObjects, this.managedObjects, this.resolvedConstants);
  }

  collectPolynomials(polynomials) {
    this.resolveConstants();
    this.schema.collectPolynomials(polynomials, this.params, this.resolvedConstants);
  }

  resolveConstants() {
    if (this.constants) {
      if (!this.resolvedConstants) {
        this.resolvedConstants = {};
      }
      Object.keys(this.constants).map(name => {
        let def = this.schema.constants[name];
        let val = this.constants[name];
        if (def.type === 'number') {
          val = parseFloat(val);
        }
        if (def.transform) {
          val = def.transform(val);
        }
        this.resolvedConstants[name] = val;
      });
    }
  }

  write() {
    return {
      typeId: this.schema.id,
      objects: this.objects.map(o => o.id),
      constants: this.constants
    }
  }

  static read({typeId, objects, constants}, index) {
    const schema = ConstraintDefinitions[typeId];
    if (!schema) {
      throw "constraint schema ' + typeId + ' doesn't exist";
    }
    return new AlgNumConstraint(schema, objects.map(oId => index[oId]), constants);
  }

  initConstants() {
    if (this.schema.constants) {
      this.constants = {};
      Object.keys(this.schema.constants).map(name => {
        let val = this.schema.constants[name].initialValue(this);
        if (typeof val === 'number') {
          val = val.toFixed(2) + '';
        }
        this.constants[name] = val;

      });
    }
  }
}

