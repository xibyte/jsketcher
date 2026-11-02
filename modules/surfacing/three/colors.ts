/**
 * Shared color palette for all surfacing Three.js primitives.
 * Edit these values to retheme the whole module.
 */

// ---- Surfaces (NurbsSurface) ----
export const SURFACE_BASE_COLOR = 0xd0d0d0;       // silver
export const SURFACE_HOVER_COLOR = 0x88bbee;      // cyan-blue (hovered)
export const SURFACE_HOVER_SET_COLOR = 0xb0d0e8;  // dimmer cyan-blue (others in same set)
export const SURFACE_SELECTED_COLOR = 0xffd040;   // amber (selected)
export const WIREFRAME_COLOR = 0x2080ff;

// ---- Bounding curves (edges of a surface) ----
// Indexed by side: bottom, right, top, left
export const EDGE_COLORS = [0x2277ee, 0x22bb44, 0xdd3333, 0xddaa22];
export const EDGE_HOVER_COLOR = 0xffffff;
export const EDGE_SELECTED_COLOR = 0xffffff;

// ---- Cage (control point grid lines) ----
export const CAGE_LINE_COLOR = 0x1a1a1a;

// ---- Control points (handles) ----
export const CP_COLOR = 0x222222;
export const CP_HOVER_COLOR = 0xffaa00;
export const CP_SELECTED_COLOR = 0xee3333;
export const CP_MIRROR_COLOR = 0x334466;

// ---- NurbsCurve (standalone curve) ----
export const CURVE_COLOR = 0x44aaff;
export const CURVE_HOVER_COLOR = 0x88ccff;
export const CURVE_SELECTED_COLOR = 0xffffff;
