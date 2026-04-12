import React from 'react';
import {state, type StateStream} from 'lstream';
import {useStream} from 'ui/effects';

/**
 * The single React slot for all surfacing overlay UI.
 *
 * The editor's tool-stack lifecycle drives what's in the slot via
 * `SurfacingUI.setUI(Component | null)`. A tool's `createUI()` factory
 * is called by the editor during pushTool / popTool transitions; its
 * return value goes straight into this stream. No central dispatcher,
 * no `instanceof` checks.
 *
 * The factory closes over its tool, so the stored component is
 * parameterless. On every stream tick `SurfacingUI` just re-renders
 * whatever's in the slot.
 */
const uiComponent$: StateStream<React.FC | null> = state<React.FC | null>(null);

export function SurfacingUI() {
  const Comp = useStream(uiComponent$);
  return Comp ? <Comp /> : null;
}

export namespace SurfacingUI {
  /** Replace the current overlay UI. Pass `null` to clear. */
  export function setUI(Component: React.FC | null): void {
    uiComponent$.next(Component);
  }
}
