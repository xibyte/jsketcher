import {R_Distance, R_DistancePP, R_PointOnLine, R_TangentLC, R_UnitVector} from "./residuals";
import {indexById} from "../../../../modules/gems/iterables";
import {distanceAB} from "../../math/math";

export const ConstraintDefinitions = indexById([

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

    constructibleObjects: ([line, circle]) => [line.gcLine, circle.gcCircle],

    collectResiduals: (residuals, constraint) => {
      const [gcLine] = constraint.objects;
      residuals.push([R_TangentLC, constraint.params, [constraint.constants.inverted]]);
    }


  },

  {
    id: 'PointOnLine',
    name: 'Point On Line',

    constructibleObjects: ([point, line]) => [point.gcPoint, line.gcLine],

    collectResiduals: (residuals, constraint) => {
      residuals.push([R_PointOnLine, constraint.params, []]);
    }

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
          return distanceAB(a, b)
        }
      }
    },

    constructibleObjects: ([p1, p2]) => [p1.gcPoint, p2.gcPoint],

    collectResiduals: (residuals, constraint) => {
      residuals.push([R_DistancePP, constraint.params, [constraint.constants.distance]]);
    }

  },


]);

export class SEACConstraint {

  static Counter = 0;

  constructor(schema, attachedObjects, constants) {
    this.id = schema.id + ':' + (SEACConstraint.Counter ++); // only for debug purposes - not persisted
    this.attachedObjects = attachedObjects;
    this.objects = schema.constructibleObjects(attachedObjects);
    this.constants = constants;
    this.objects.forEach(o => {
      o.constraints.push(this);
    });
    this.internal = false;
    this.schema = schema;
  }

  collectParams(params) {
    this.objects.forEach(o => o.collectParams(params));
  }

  get params() {
    const params = [];
    this.collectParams(params);
    return params;
  }

  visitAdjacentConstraints(fn) {
    this.objects.forEach(o => o.constraints.forEach(fn));
  }

  collectResiduals(out) {
    return this.schema.collectResiduals(out, this);
  }
}

