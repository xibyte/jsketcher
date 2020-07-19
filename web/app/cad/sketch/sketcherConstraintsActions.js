export default [
  {
    id: 'sketchConstraint_coincident',
    appearance: {
      info: 'add coincident constraint',
      label: 'coincident',
      icon32: 'img/coi.png',
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.coincident(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_verticalConstraint',
    appearance: {
      info: 'Vertical Constraint',
      label: 'vertical',
      icon32: 'img/vert.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.vertical(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_horizontalConstraint',

    appearance: {
      info: 'Horizontal Constraint',
      label: 'horizontal',
      icon32: 'img/hor.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.horizontal(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_parallelConstraint',
    appearance: {
      info: 'Parallel Constraint',
      label: 'parallel',
      icon32: 'img/par.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.parallel(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_perpendicularConstraint',

    appearance: {
      info: 'Perpendicular Constraint',
      label: 'perpendicular',
      icon32: 'img/per.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.perpendicular(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_P2LDistanceConstraint',

    appearance: {
      info: 'Distance Between Point and Line',
      label: 'point & line',
      icon32: 'img/p2l.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.p2lDistance(viewer.selected, prompt);
    }
  },

  {
    id: 'sketchConstraint_P2PDistanceConstraint',

    appearance: {
      info: 'Distance Between two Points',
      label: 'point & point',
      icon32: 'img/p2p.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.p2pDistance(viewer.selected, prompt);
    }
  },

  {
    id: 'sketchConstraint_RadiusConstraint',
    appearance: {
      info: 'Radius Constraint',
      label: 'radius',
      icon32: 'img/rad.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.radius(viewer.selected, prompt);
    }
  },

  {
    id: 'sketchConstraint_EntityEqualityConstraint',

    appearance: {
      info: 'Entity Equals Constraint(radius or length of a segment)',
      label: 'equals',
      icon32: 'img/eq.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.entityEquality(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_tangentConstraint',
    appearance: {
      info: 'Tangent Constraint',
      label: 'tangent',
      icon32: 'img/tgn.png'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.tangent(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_lockConstraint',
    appearance: {
      info: 'Lock Constraint',
      label: 'lock',
      cssIcons: ['lock']
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.lock(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_pointOnLine',
    appearance: {
      info: 'Point On Line',
      label: 'point & line',
      icon32: 'img/vec/pointOnLine.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.pointOnLine(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_pointOnArc',
    appearance: {
      info: 'Point On Arc / Ellipse',
      label: 'point & arc',
      icon32: 'img/vec/pointOnArc.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.pointOnArc(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_pointInMiddle',
    appearance: {
      info: 'Point In the Middle',
      label: 'point @ middle',
      icon32: 'img/vec/pointInMiddle.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.pointInMiddle(viewer.selected);
    }
  },

  {
    id: 'sketchConstraint_llAngle',
    appearance: {
      info: 'Angle Between 2 Lines',
      label: 'angle',
      icon32: 'img/vec/angle.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.llAngle(viewer.selected, prompt);
    }
  },

  {
    id: 'sketchConstraint_symmetry',
    appearance: {
      info: 'Symmetry',
      label: 'symmetry',
      icon32: 'img/vec/symmetry.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.symmetry(viewer.selected, prompt);
    }
  },
  {
    id: 'sketchConstraint_mirror',
    appearance: {
      info: 'Mirror Objects off of a Line',
      label: 'mirror',
      cssIcons: ['star-half-o']
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.mirror(viewer.selected);
    }
  },
  {
    id: 'sketchConstraint_lockConvex',
    appearance: {
      info: 'Lock Convexity',
      label: 'convex',
      icon32: 'img/vec/convex.svg'
    },
    invoke: ({services}) => {
      let viewer = services.sketcher.inPlaceEditor.viewer;
      viewer.parametricManager.lockConvex(viewer.selected, alert);
    }
  },

];