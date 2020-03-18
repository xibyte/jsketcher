import {runActionOrToastWhyNot, startOperation} from "./index";
import {
  AngleBetweenConstraintIcon, AngleConstraintIcon,
  CoincidentConstraintIcon, DistanceConstraintIcon,
  DistancePLConstraintIcon, EqualConstraintIcon, FilletConstraintIcon,
  HorizontalConstraintIcon, LockConstraintIcon,
  ParallelConstraintIcon,
  PerpendicularConstraintIcon, PointInMiddleConstraintIcon, PointOnCurveConstraintIcon,
  PointOnLineConstraintIcon, RadiusConstraintIcon, SymmetryConstraintIcon, TangentConstraintIcon,
  VerticalConstraintIcon
} from "../icons/constraints/ConstraintIcons";
import {toast} from "react-toastify";
import {MirrorGeneratorIcon} from "../icons/generators/GeneratorIcons";

export default [

  {
    id: 'CoincidentGlobal',
    shortName: 'Coincident',
    kind: 'Constraint',
    description: 'Point Coincident Constraint',
    icon: CoincidentConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Coincident', ctx,)
    }
  },

  {
    id: 'VerticalGlobal',
    shortName: 'Vertical',
    kind: 'Constraint',
    description: 'Vertical Constraint',
    icon: VerticalConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Vertical', ctx);
    }
  },

  {
    id: 'HorizontalGlobal',
    shortName: 'Horizontal',
    kind: 'Constraint',
    description: 'Horizontal Constraint',
    icon: HorizontalConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Horizontal', ctx);
    }
  },

  {
    id: 'ParallelGlobal',
    shortName: 'Parallel',
    kind: 'Constraint',
    description: 'Parallel Constraint',
    icon: ParallelConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Parallel', ctx);
    }
  },

  {
    id: 'PerpendicularGlobal',
    shortName: 'Perpendicular',
    kind: 'Constraint',
    description: 'Perpendicular Constraint',
    icon: PerpendicularConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Perpendicular', ctx);
    }
  },

  {
    id: 'DistancePLGlobal',
    shortName: 'Point to Line Distance',
    kind: 'Constraint',
    description: 'Distance Between Point and Line',
    icon: DistancePLConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('DistancePL', ctx);
    }
  },

  {
    id: 'DistanceGlobal',
    shortName: 'Point to Point Distance',
    kind: 'Constraint',
    description: 'Distance Between Two Points',
    icon: DistanceConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('DistancePP', ctx);
    }
  },

  {
    id: 'EntityEqualityGlobal',
    shortName: 'Entity Equality',
    kind: 'Constraint',
    description: 'Equal Length or Equal Radius',
    icon: EqualConstraintIcon,

    invoke: (ctx) => {
      const fail1 = runActionOrToastWhyNot('EqualRadius', ctx, true);
      const fail2 = runActionOrToastWhyNot('EqualLength', ctx, true);
      if (fail1 && fail2) {
        toast('Requires selection of either segments or circles and arcs');
      }
    }
  },

  {
    id: 'PointOnLineGlobal',
    shortName: 'Point On Line',
    kind: 'Constraint',
    description: 'Point On Line',
    icon: PointOnLineConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('PointOnLine', ctx);
    }
  },

  {
    id: 'TangentGlobal',
    shortName: 'Tangent',
    kind: 'Constraint',
    description: 'Tangent Between Different Curves',
    icon: TangentConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Tangent', ctx);
    }
  },

  {
    id: 'RadiusGlobal',
    shortName: 'Radius',
    kind: 'Constraint',
    description: 'Radius of a Circle or Arc',
    icon: RadiusConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('RadiusLength', ctx);
    }
  },

  {
    id: 'PointOnCurveGlobal',
    shortName: 'Point On Curve',
    kind: 'Constraint',
    description: 'Point On Curve',
    icon: PointOnCurveConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('PointOnCircle', ctx);
    }
  },

  {
    id: 'PointInMiddleGlobal',
    shortName: 'Point In Middle',
    kind: 'Constraint',
    description: 'Point In Middle',
    icon: PointInMiddleConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('PointInMiddle', ctx);
    }
  },

  {
    id: 'SymmetryGlobal',
    shortName: 'Symmetry',
    kind: 'Constraint',
    description: 'Symmetry',
    icon: SymmetryConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Symmetry', ctx);
    }
  },

  {
    id: 'AngleBetweenGlobal',
    shortName: 'Angle Between',
    kind: 'Constraint',
    description: 'Angle Between',
    icon: AngleBetweenConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('AngleBetween', ctx);
    }
  },

  {
    id: 'AngleGlobal',
    shortName: 'Angle',
    kind: 'Constraint',
    description: 'Angle of a Line',
    icon: AngleConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Angle', ctx);
    }
  },

  {
    id: 'LockGlobal',
    shortName: 'Lock',
    kind: 'Constraint',
    description: 'Locks a point',
    icon: LockConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Lock', ctx);
    }
  },

  {
    id: 'FilletGlobal',
    shortName: 'Fillet',
    kind: 'Constraint',
    description: 'Make a Fillet',
    icon: FilletConstraintIcon,

    invoke: (ctx) => {
      runActionOrToastWhyNot('Fillet', ctx);
    }
  },

  {
    id: 'Mirror',
    shortName: 'Mirror',
    kind: 'Constraint',
    description: 'Make a Fillet',
    icon: MirrorGeneratorIcon,

    invoke: (ctx) => {
      startOperation(ctx, 'Mirror');
    }
  },

]

