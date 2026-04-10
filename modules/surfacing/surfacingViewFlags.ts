import {state, StateStream} from 'lstream';

export interface SurfacingViewFlags {
  faces: boolean;
  mesh: boolean;
  edges: boolean;
  boundaries: boolean;
}

const STORAGE_KEY = 'jsketcher.surfacingViewFlags';

function loadFlags(): SurfacingViewFlags {
  const defaults: SurfacingViewFlags = {faces: true, mesh: false, edges: false, boundaries: true};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return {...defaults, ...JSON.parse(raw)};
  } catch (e) { /* ignore */ }
  return defaults;
}

export const surfacingViewFlags$: StateStream<SurfacingViewFlags> = state(loadFlags());

surfacingViewFlags$.attach(flags => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flags)); } catch (e) { /* ignore */ }
});

export function toggleFlag(key: keyof SurfacingViewFlags): void {
  surfacingViewFlags$.mutate(f => { f[key] = !f[key]; return f; });
}
