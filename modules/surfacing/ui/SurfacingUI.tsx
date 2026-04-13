import React from 'react';
import {state, type StateStream} from 'lstream';
import {useStream} from 'ui/effects';

/**
 * Port-based surfacing UI.
 *
 * Instead of a single overlay slot, the surfacing layer exposes two named
 * UI ports where anyone (tools, wizards, external code) can contribute
 * React components by id:
 *
 *   - `'right'`  — top-right column under the toolbar; holds selection
 *                  dialogs and parameter panels
 *   - `'bottom'` — bottom-center column above the operation history;
 *                  holds transient tool banners
 *
 * Each port is a flex column with gap, so multiple contributions stack
 * naturally. Adding with an existing id replaces silently — contributors
 * don't need to remove before re-adding.
 *
 * Tools / wizards are responsible for their own lifecycle:
 *   - `addToPort(portId, componentId, Component)` in init() / start()
 *   - `removeFromPort(componentId)` in cleanup()
 *
 * The editor itself no longer manages UI state; it just drives tool
 * init/cleanup via the tool stack.
 */

export type PortId = 'right' | 'bottom';

interface PortEntry {
  id: string;
  Component: React.FC;
}

interface Ports {
  right: PortEntry[];
  bottom: PortEntry[];
}

const ports$: StateStream<Ports> = state<Ports>({right: [], bottom: []});

/**
 * Add a component to a port. If a component with the same id already
 * exists in any port, it's replaced in place (same port or moved).
 */
export function addToPort(portId: PortId, componentId: string, Component: React.FC): void {
  const prev = ports$.value;
  const next: Ports = {
    right: prev.right.filter(e => e.id !== componentId),
    bottom: prev.bottom.filter(e => e.id !== componentId),
  };
  next[portId] = [...next[portId], {id: componentId, Component}];
  ports$.next(next);
}

/** Remove the component with the given id from whichever port holds it. */
export function removeFromPort(componentId: string): void {
  const prev = ports$.value;
  ports$.next({
    right: prev.right.filter(e => e.id !== componentId),
    bottom: prev.bottom.filter(e => e.id !== componentId),
  });
}

export function SurfacingUI() {
  const ports = useStream(ports$);
  if (!ports) return null;
  return (
    <>
      {/* Right port — top-right column, under the toolbar. */}
      <div style={{
        position: 'fixed', right: 10, top: 60,
        maxHeight: 'calc(100vh - 80px)',
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 10000, pointerEvents: 'none',
      }}>
        {ports.right.map(({id, Component}) => <Component key={id} />)}
      </div>
      {/* Bottom port — bottom-center column stack, above the op history. */}
      <div style={{
        position: 'fixed', bottom: 110, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 10001, pointerEvents: 'none',
      }}>
        {ports.bottom.map(({id, Component}) => <Component key={id} />)}
      </div>
    </>
  );
}
