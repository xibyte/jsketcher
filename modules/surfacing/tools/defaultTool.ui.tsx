import React from 'react';
import {useStream} from 'ui/effects';
import type {DefaultTool} from './defaultTool';
import {NurbsSurfaceDialog} from '../models/NurbsSurface/NurbsSurface.dialog';
import {
  BoundingCurveDialog,
  ArcConstraintEditor,
} from '../models/BoundingCurve/BoundingCurve.dialog';

/**
 * Factory for DefaultTool's port contribution. Closes over the tool so
 * the returned parameterless component can subscribe to state$ and call
 * the tool's mutation methods directly.
 *
 * The component renders as a React fragment — its non-fixed children
 * (surface dialog, edge dialog) flow inside the right-port container;
 * the ArcConstraintEditor has its own `position: fixed, left: 10` and
 * escapes the container to sit on the opposite side of the screen.
 */
export function defaultToolUI(tool: DefaultTool): React.FC {
  return function DefaultToolUI() {
    const state = useStream(tool.state$);
    if (!state) return null;

    return (
      <>
        {state.selectedSurface && (
          <NurbsSurfaceDialog
            surface={state.selectedSurface.surface}
            onClose={() => tool.deselectSurface()}
            onPushPull={(d) => tool.pushPull(d)}
            onExtrude={(d) => tool.extrude(d)}
            onSubdivide={() => tool.subdivide()}
            onRemove={() => tool.removeSurface()}
          />
        )}
        {state.selectedCurve && (
          <BoundingCurveDialog
            curve={state.selectedCurve.curve}
            side={state.selectedCurve.side}
            hasNeighbor={state.selectedCurve.hasNeighbor}
            onClose={() => tool.deselectCurve()}
            onApplyArc90={(flip) => tool.applyArc90(flip)}
            onRemoveArc={() => tool.removeArc()}
            onApplyG1={() => tool.applyG1()}
            onApplyG2={() => tool.applyG2()}
            onMirror={() => tool.mirror()}
          />
        )}
        {state.arcDialog && (
          <ArcConstraintEditor
            surface={state.arcDialog.surface}
            onClose={() => tool.closeArcDialog()}
            onApply={(params) => tool.arcApplyLive(params)}
            onRemove={() => tool.arcRemoveConstraint()}
          />
        )}
      </>
    );
  };
}
