import {R_DistancePP, R_Equal, R_PointOnLine} from "./residuals";
import {indexById} from "../../../../modules/gems/iterables";
import {DEG_RAD, distanceAB} from "../../math/math";
import {COS_FN, Polynomial, POW_1_FN, POW_2_FN, SIN_FN} from "./polynomial";
import {Types} from "../io";

export const ConstraintDefinitions = indexById([

  {
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


  {
    id: 'TangentLC',
    name: 'Line & Circle Tangency',
    constants: {
      inverted: {
        type: 'boolean',
        description: 'whether the circle attached from the opposite side',
        initialValue: () => false
      }
    },

    defineParamsScope: ([segment, circle], callback) => {
      callback(segment.params.ang);
      callback(segment.params.w);
      circle.c.visitParams(callback);
      callback(circle.r);
    },


    collectPolynomials: (polynomials, [ang, w, cx, cy, r], {inverted}) => {
      polynomials.push(new Polynomial(0)
        .monomial(1)
          .term(cx, POW_1_FN)
          .term(ang, COS_FN)
        .monomial(1)
          .term(cy, POW_1_FN)
          .term(ang, SIN_FN)
        .monomial(-1)
          .term(w, POW_1_FN)
        .monomial(- (inverted ? -1 : 1))
          .term(r, POW_1_FN)
      );
    },
  },

  {
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

  {
    id: 'DistancePP',
    name: 'Distance Between Two Point',
    constants: {
      distance: {
        type: 'number',
        description: 'the distance between two points',
        initialValue: (constraint) => {
          const [a, b] = constraint.object;
          return distanceAB(a, b).toFixed(2) + '';
        }
      }
    },

    defineParamsScope: ([pt, segment], callback) => {
      pt.visitParams(callback);
      callback(segment.params.ang);
      callback(segment.params.w);
    },

    collectResiduals: (residuals, params, {distance}) => {
      residuals.push([R_DistancePP, params, [distance]]);
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

  {
    id: 'Angle',
    name: 'Absolute Line Angle',
    constants: {
      angle: {
        type: 'number',
        description: 'line angle',
        initialValue: (constraint) => {
          let degrees = constraint.objects[0].params.ang.get() / DEG_RAD;
          degrees = (degrees + 360 - 90) % 360;
          return degrees.toFixed(2) + '';
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

]);

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
    this.schema.defineParamsScope(this.objects, p => this.params.push(p));
    // this.paramSet = new Set(this.params);
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
        if (def.type === 'number') {
          let val = parseFloat(this.constants[name]);
          if (def.transform) {
            val = def.transform(val);
          }
          this.resolvedConstants[name] = val;
        }
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
        this.constants[name] = this.schema.constants[name].initialValue(this);
      });
    }
  }
}

