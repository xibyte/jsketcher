import React from 'react';
import {useStream} from 'ui/effects';
import type {DefaultTool} from './defaultTool';
import {NurbsSurfaceDialog} from '../models/NurbsSurface/NurbsSurface.dialog';
import {BoundingCurveDialog} from '../models/BoundingCurve/BoundingCurve.dialog';

/**
 * Factory for DefaultTool's port contribution. Closes over the tool so
 * the returned parameterless component can subscribe to state$ and
 * manage tool-level selection state transitions (deselectSurface,
 * deselectCurve).
 *
 * Mutation ops (push/pull, arc, G1/G2, mirror, etc.) are NOT routed
 * through the tool — the entity dialogs call them directly via
 * `surface.ctx`. The arc constraint editor is owned by BoundingCurveDialog
 * as a local modal, so this component doesn't need to know about it.
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
          />
        )}
        {state.selectedCurve && state.selectedSurface && (
          <BoundingCurveDialog
            surface={state.selectedSurface.surface}
            curve={state.selectedCurve.curve}
            side={state.selectedCurve.side}
            hasNeighbor={state.selectedCurve.hasNeighbor}
            onClose={() => tool.deselectCurve()}
          />
        )}
      </>
    );
  };
}
