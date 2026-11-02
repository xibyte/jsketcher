import {state, StateStream} from 'lstream';

export interface SurfacingViewFlags {
  faces: boolean;
  /** UV isoline wireframe overlay (n rows + n cols per surface). */
  isolines: boolean;
  /** Full tessellation wireframe (every TessEdge as a line). */
  tessellation: boolean;
  edges: boolean;
  boundaries: boolean;
}

const STORAGE_KEY = 'jsketcher.surfacingViewFlags';

function loadFlags(): SurfacingViewFlags {
  const defaults: SurfacingViewFlags = {
    faces: true,
    isolines: false,
    tessellation: false,
    edges: false,
    boundaries: true,
  };
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

/**
 * Toggle a flag. `isolines` and `tessellation` are mutually exclusive —
 * enabling one clears the other.
 */
export function toggleFlag(key: keyof SurfacingViewFlags): void {
  surfacingViewFlags$.mutate(f => {
    const next = !f[key];
    f[key] = next;
    if (next) {
      if (key === 'isolines') f.tessellation = false;
      else if (key === 'tessellation') f.isolines = false;
    }
    return f;
  });
}
