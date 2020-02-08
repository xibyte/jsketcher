import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint} from "../shapes/point";
import {Circle} from "../shapes/circle";
import {Segment} from "../shapes/segment";
import {isInstanceOf, matchAll, matchTypes, sortSelectionByType} from "./matchUtils";
import constraints from "../../../test/cases/constraints";
import {Arc} from "../shapes/arc";
import {FilletTool} from "../tools/fillet";

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
        pm._add(
          new AlgNumConstraint(ConstraintDefinitions.PCoincident, [first, obj])
        );
      }
      pm.commit();
    }
  },

  {
    shortName: 'Tangent',
    description: 'Tangent Between Line And Circle',
    selectionMatcher: [
      (selection, sortedByType) => matchTypes(sortedByType, Circle, 1, Segment, 1),
      (selection, sortedByType) => matchTypes(sortedByType, Arc, 1, Segment, 1),
    ],

    invoke: ctx => {

      const {viewer} = ctx;
      const [circle, line] = sortSelectionByType(viewer.selected);

      const constraint = new AlgNumConstraint(ConstraintDefinitions.TangentLC, [line, circle]);
      constraint.initConstants();
      const pm = viewer.parametricManager;
      pm.add(constraint);
    }

  },

  {
    shortName: 'EqualRadius',
    description: 'Equal Radius Between Two Circle',
    selectionMatcher: selection => {
      for (let obj of selection) {
        if (!(isInstanceOf(obj, Circle) || isInstanceOf(obj, Arc))) {
          return false;
        }
      }
      return true;
    },

    invoke: ctx => {

      const {viewer} = ctx;

      const pm = viewer.parametricManager;
      for (let i = 1; i < viewer.selected.length; ++i) {
        pm._add(new AlgNumConstraint(ConstraintDefinitions.EqualRadius, [viewer.selected[i-1], viewer.selected[i]]));
      }
      pm.commit();
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
      pm.add(new AlgNumConstraint(ConstraintDefinitions.PointOnLine, [pt, line]));
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
        pm._add(firstConstr);
        for (let i = 1; i < viewer.selected.length; ++i) {
          pm._add(new AlgNumConstraint(ConstraintDefinitions.Angle, [viewer.selected[i]], {...firstConstr.constants}));
        }
        pm.commit();
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
        pm._add(firstConstr);
        for (let i = 2; i < viewer.selected.length; ++i) {
          pm._add(new AlgNumConstraint(ConstraintDefinitions.Angle,
            [viewer.selected[i-1], viewer.selected[i]], {...firstConstr.constants}));
        }
        pm.commit();
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
        pm._add(firstConstr);
        for (let other of others) {
          pm._add(new AlgNumConstraint(ConstraintDefinitions.SegmentLength, [other], {...firstConstr.constants}));
        }
        pm.commit();
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
      editConstraint(ctx, constr, () => viewer.parametricManager.add(constr));
    }
  },

  {
    shortName: 'Fillet',
    description: 'Add a Fillet',
    selectionMatcher: (selection) => {
      if (matchTypes(selection, EndPoint, 1)) {
        const [point] = selection;
        if (isInstanceOf(point.parent, Segment)) {
          let pair = null;
          point.visitLinked(l => {
            if (l !== point && isInstanceOf(l.parent, Segment)) {
              pair = l;
              return true;
            }
          });
          if (pair) {
            return true;
          }
        }
      }
      return false;
    },

    invoke: ctx => {
      const {viewer} = ctx;



      const filletTool = new FilletTool(ctx.viewer);
      const cands = filletTool.getCandidateFromSelection(viewer.selected);
      if (cands) {
        filletTool.breakLinkAndMakeFillet(cands[0], cands[1]);
      }

    }
  },

  {
    shortName: 'Mirror',
    description: 'Mirror Objects',
    selectionMatcher: selection => isInstanceOf(selection[0], Segment) && selection.length > 1,


    invoke: ctx => {
      const {viewer} = ctx;

      const objects = viewer.selected;
      const managedObjects = [];
      for (let i = 1; i < objects.length; i++) {
        let obj = objects[i];
        const copy = obj.copy();
        obj.layer.add(copy);
        managedObjects.push(copy);
      }

      ConstraintDefinitions.Mirror.modify(objects, managedObjects);


      // const constr = new AlgNumConstraint(ConstraintDefinitions.Mirror, [...objects, ...managedObjects]);

      // viewer.parametricManager.addModifier(constr);

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