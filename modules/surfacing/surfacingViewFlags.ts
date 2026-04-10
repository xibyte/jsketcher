import {state, StateStream} from 'lstream';

export interface SurfacingViewFlags {
  faces: boolean;
  mesh: boolean;
  edges: boolean;
}

const STORAGE_KEY = 'jsketcher.surfacingViewFlags';

function loadFlags(): SurfacingViewFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return {faces: true, mesh: false, edges: false, ...JSON.parse(raw)};
  } catch (e) { /* ignore */ }
  return {faces: true, mesh: false, edges: false};
}

export const surfacingViewFlags$: StateStream<SurfacingViewFlags> = state(loadFlags());

surfacingViewFlags$.attach(flags => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flags)); } catch (e) { /* ignore */ }
});

export function toggleFlag(key: keyof SurfacingViewFlags): void {
  surfacingViewFlags$.mutate(f => { f[key] = !f[key]; return f; });
}
