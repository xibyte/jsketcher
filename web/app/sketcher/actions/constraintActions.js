import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint} from "../shapes/point";
import {Circle} from "../shapes/circle";
import {Segment} from "../shapes/segment";
import {matchAll, matchTypes, sortSelectionByType} from "./matchUtils";

export default [


  {
    shortName: 'Coincident',
    description: 'Point Coincident',
    selectionMatcher: (selection, sortedByType) => matchAll(selection, EndPoint, 2),

    invoke: viewer => {
      const [first, ...others] = viewer.selected;
      let pm = viewer.parametricManager;
      for (let obj of others) {
        pm.algnNumSystem.addConstraint(
          new AlgNumConstraint(ConstraintDefinitions.PCoincident, [first, obj])
        );
      }
      pm.refresh();
    }
  },

  {
    shortName: 'Tangent',
    description: 'Tangent Between Line And Circle',
    selectionMatcher: (selection, sortedByType) => matchTypes(sortedByType, Circle, 1, Segment, 1),

    invoke: viewer => {
      const [circle, line] = sortSelectionByType(viewer.selected);
      let pm = viewer.parametricManager;
      const ang = line.params.ang.get();
      const w = line.params.w.get();
      const inverted = Math.cos(ang) * circle.c.x + Math.sin(ang) * circle.c.y < w ;

      pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.TangentLC, [line, circle], {
        inverted
      }));
    }

  },

  {
    shortName: 'Point On Line',
    description: 'Point On Line',
    selectionMatcher: (selection, sortedByType) => matchTypes(sortedByType, EndPoint, 1, Segment, 1),

    invoke: viewer => {
      const [pt, line] = sortSelectionByType(viewer.selected);
      let pm = viewer.parametricManager;
      pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.PointOnLine, [pt, line]));
    }
  },

  {
    shortName: 'Angle',
    description: 'Angle',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 1),

    invoke: viewer => {

      const firstSegment = viewer.selected[0];

      const firstConstr = new AlgNumConstraint(ConstraintDefinitions.Angle, [firstSegment]);
      firstConstr.initConstants();

      viewer.streams.constraintEditRequest.next({
        constraint: firstConstr,
        onCancel: () => viewer.streams.constraintEditRequest.next(null),
        onApply: () => {
          viewer.streams.constraintEditRequest.next(null);
          const pm = viewer.parametricManager;
          pm.algnNumSystem.addConstraint(firstConstr);
          for (let i = 1; i < viewer.selected.length; ++i) {
            pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.Angle, viewer.selected[i], {...firstConstr.constants}));
          }
          pm.refresh();
        }
      });

    }
  }



];