import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint} from "../shapes/point";
import {Circle} from "../shapes/circle";
import {Segment} from "../shapes/segment";
import {matchAll, matchTypes, sortSelectionByType} from "./matchUtils";
import constraints from "../../../test/cases/constraints";

export default [


  {
    shortName: 'Coincident',
    description: 'Point Coincident',
    selectionMatcher: (selection, sortedByType) => matchAll(selection, EndPoint, 2),

    invoke: ctx => {
      const {viewer} = ctx;
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

    invoke: ctx => {

      const {viewer} = ctx;
      const [circle, line] = sortSelectionByType(viewer.selected);

      const constraint = new AlgNumConstraint(ConstraintDefinitions.TangentLC, [line, circle]);
      constraint.initConstants();
      const pm = viewer.parametricManager;
      pm.algnNumSystem.addConstraint(constraint);
      pm.refresh();
    }

  },

  {
    shortName: 'Point On Line',
    description: 'Point On Line',
    selectionMatcher: (selection, sortedByType) => matchTypes(sortedByType, EndPoint, 1, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;
      const [pt, line] = sortSelectionByType(viewer.selected);
      let pm = viewer.parametricManager;
      pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.PointOnLine, [pt, line]));
    }
  },

  {
    shortName: 'Angle',
    description: 'Angle',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;

      const firstSegment = viewer.selected[0];

      const firstConstr = new AlgNumConstraint(ConstraintDefinitions.Angle, [firstSegment]);
      firstConstr.initConstants();

      editConstraint(ctx, firstConstr, () => {
        const pm = viewer.parametricManager;
        pm.algnNumSystem.addConstraint(firstConstr);
        for (let i = 1; i < viewer.selected.length; ++i) {
          pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.Angle, [viewer.selected[i]], {...firstConstr.constants}));
        }
        pm.refresh();
      });
    }
  },

  {
    shortName: 'Angle Between',
    description: 'Angle Between Lines',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 2),

    invoke: ctx => {
      const {viewer} = ctx;

      const [firstSegment, secondSegment] = viewer.selected;

      const firstConstr = new AlgNumConstraint(ConstraintDefinitions.AngleBetween, [firstSegment, secondSegment]);
      firstConstr.initConstants();

      editConstraint(ctx, firstConstr, () => {
        const pm = viewer.parametricManager;
        pm.algnNumSystem.addConstraint(firstConstr);
        for (let i = 2; i < viewer.selected.length; ++i) {
          pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.Angle,
            [viewer.selected[i-1], viewer.selected[i]], {...firstConstr.constants}));
        }
        pm.refresh();
      });
    }
  },

  {
    shortName: 'Length',
    description: 'Segment Length',
    selectionMatcher: (selection) => matchAll(selection, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;

      const [firstSegment, ...others] = viewer.selected;

      const firstConstr = new AlgNumConstraint(ConstraintDefinitions.SegmentLength, [firstSegment]);
      firstConstr.initConstants();

      editConstraint(ctx, firstConstr, () => {
        const pm = viewer.parametricManager;
        pm.algnNumSystem.addConstraint(firstConstr);
        for (let other of others) {
          pm.algnNumSystem.addConstraint(new AlgNumConstraint(ConstraintDefinitions.SegmentLength, [other], {...firstConstr.constants}));
        }
        pm.refresh();
      });
    }
  },

  {
    shortName: 'Lock',
    description: 'Lock Point',
    selectionMatcher: (selection) => matchTypes(selection, EndPoint, 1),

    invoke: ctx => {
      const {viewer} = ctx;

      const [point] = viewer.selected;

      const constr = new AlgNumConstraint(ConstraintDefinitions.LockPoint, [point]);
      constr.initConstants();
      editConstraint(ctx, constr, () => viewer.parametricManager.addAlgNum(constr));
    }
  }

];


function editConstraint(ctx, constraint, onApply) {

  const rqStream = ctx.ui.$constraintEditRequest;
  rqStream.next({
    constraint,
    onCancel: () => rqStream.next(null),
    onApply: () => {
      rqStream.next(null);
      onApply();
    }
  });

}