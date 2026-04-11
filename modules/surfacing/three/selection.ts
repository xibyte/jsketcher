/**
 * Lightweight per-module selection state.
 *
 * One "currently selected" entity at a time (vertex / CP / edge / surface /
 * group — anything implementing Selectable). No god controller — entities
 * call select(this) on click, and any component that cares subscribes to
 * selection$ directly.
 *
 *   import {select, selection$} from '../../three';
 *
 *   // In a click handler:
 *   select(myControlPointObject3d);
 *
 *   // In an overlay:
 *   selection$.attach(sel => { if (sel instanceof ControlPointObject3D) ... });
 */
import {state, StateStream} from 'lstream';
import type {Selectable} from './EntityObject3D';

export const selection$: StateStream<Selectable | null> = state<Selectable | null>(null);

/** Select an entity. Deselects the previous one. No-op if already selected. */
export function select(s: Selectable | null): void {
  const current = selection$.value;
  if (current === s) return;
  if (current) current.setSelected(false);
  if (s) {
    if (!s.isSelectable()) return;
    s.setSelected(true);
  }
  selection$.next(s);
}

/** Clear the current selection. */
export function deselect(): void {
  select(null);
}
