import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {EndPoint} from "../shapes/point";
import {Circle} from "../shapes/circle";
import {Segment} from "../shapes/segment";
import {isInstanceOf, matchAll, matchTypes, sortSelectionByType} from "./matchUtils";
import constraints from "../../../test/cases/constraints";
import {Arc} from "../shapes/arc";
import {FilletTool} from "../tools/fillet";
import {editConstraint as _editConstraint} from "../components/ConstraintEditor";

export default [


  {
    id: 'Coincident',
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
    id: 'Tangent',
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
    id: 'EqualRadius',
    shortName: 'Equal Radius',
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
    id: 'EqualLength',
    shortName: 'Equal Length',
    description: 'Equal Length Between Two Segments',
    selectionMatcher: selection => matchAll(selection, Segment, 2),

    invoke: ctx => {
      const {viewer} = ctx;
      const pm = viewer.parametricManager;
      for (let i = 1; i < viewer.selected.length; ++i) {
        pm._add(new AlgNumConstraint(ConstraintDefinitions.EqualLength, [viewer.selected[i-1], viewer.selected[i]]));
      }
      pm.commit();
    }

  },

  {
    id: 'PointOnLine',
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
    id: 'Angle',
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
    id: 'Vertical',
    shortName: 'Vertical',
    description: 'Vertical',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;
      const pm = viewer.parametricManager;

      viewer.selected.forEach(obj => {
        const constr = new AlgNumConstraint(ConstraintDefinitions.Vertical, [obj]);
        constr.initConstants();
        pm._add(constr);
      });
      pm.commit();
    }
  },

  {
    id: 'Horizontal',
    shortName: 'Horizontal',
    description: 'Horizontal',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;
      const pm = viewer.parametricManager;

      viewer.selected.forEach(obj => {
        const constr = new AlgNumConstraint(ConstraintDefinitions.Horizontal, [obj]);
        constr.initConstants();
        pm._add(constr);
      });
      pm.commit();
    }
  },

  {
    id: 'AngleBetween',
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
    id: 'Perpendicular',
    shortName: 'Perpendicular',
    description: 'Perpendicularity between two or more lines',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 2),

    invoke: ctx => {
      const {viewer} = ctx;

      const pm = viewer.parametricManager;

      for (let i = 1; i < viewer.selected.length; ++i) {
        const constr = new AlgNumConstraint(ConstraintDefinitions.Perpendicular, [viewer.selected[i-1], viewer.selected[i]]);
        constr.initConstants();
        pm._add(constr);
      }
      pm.commit();
    }
  },

  {
    id: 'Parallel',
    shortName: 'Parallel',
    description: 'Parallelism between two or more lines',
    selectionMatcher: (selection, sortedByType) => matchAll(sortedByType, Segment, 2),

    invoke: ctx => {
      const {viewer} = ctx;

      const pm = viewer.parametricManager;

      for (let i = 1; i < viewer.selected.length; ++i) {
        const constr = new AlgNumConstraint(ConstraintDefinitions.Parallel, [viewer.selected[i-1], viewer.selected[i]]);
        constr.initConstants();
        pm._add(constr);
      }
      pm.commit();
    }
  },

  {
    id: 'Length',
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
    id: 'DistancePL',
    shortName: 'Point to Line Distance',
    description: 'Distance between Point and Line',
    selectionMatcher: (selection, sortedByType) => matchTypes(sortedByType, EndPoint, 1, Segment, 1),

    invoke: ctx => {
      const {viewer} = ctx;

      const [pt, seg] = sortSelectionByType(viewer.selected);

      const constr = new AlgNumConstraint(ConstraintDefinitions.DistancePL, [pt, seg]);
      constr.initConstants();

      editConstraint(ctx, constr, () => {
        const pm = viewer.parametricManager;
        pm.add(constr);
      });
    }
  },

  {
    id: 'DistancePP',
    shortName: 'Two Point Distance',
    description: 'Distance between two Points',
    selectionMatcher: (selection, sortedByType) => matchTypes(sortedByType, EndPoint, 2),

    invoke: ctx => {
      const {viewer} = ctx;

      const [p1, p2] = sortSelectionByType(viewer.selected);

      const constr = new AlgNumConstraint(ConstraintDefinitions.DistancePP, [p1, p2]);
      constr.initConstants();

      editConstraint(ctx, constr, () => {
        const pm = viewer.parametricManager;
        pm.add(constr);
      });
    }
  },

  {
    id: 'Lock',
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
    id: 'Fillet',
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

];

function editConstraint(ctx, constraint, onApply) {
  _editConstraint(ctx.ui.$constraintEditRequest, constraint, onApply)
}