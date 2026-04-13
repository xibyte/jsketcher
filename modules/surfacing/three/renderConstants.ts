/**
 * Shared visual constants for the surfacing three-layer: handle / edge
 * sizes, line widths, and render-order slots. Anything that's a tunable
 * number controlling how a thing is drawn lives here.
 */

// Control-point handle sizing. Visual sphere is small; an invisible picker
// sphere keeps the hitbox at full size. On selection the visual scales up.
export const HANDLE_SIZE = 3.5;
export const CP_VISUAL_SCALE = 0.45;
export const CP_HOVER_SCALE = 0.7;
export const CP_PICKER_SCALE = 1.0;

// Screen-space widths for ScalableLine-based edges
export const EDGE_WIDTH = 2.5;

// Wireframe line widths (UV mesh over a surface)
export const MESH_WIDTH_NORMAL = 1;
export const MESH_WIDTH_THICK = 1.8;

// ---------------------------------------------------------------------------
// Render orders. Three.js draws the transparent queue ascending by
// renderOrder; ties fall back to camera-depth sorting which is ambiguous
// when two depthTest:false objects sit at the same world position. Keep
// each layer at its own slot so the order is stable regardless of angle.
// ---------------------------------------------------------------------------

/** Surface mesh, default. */
export const RENDER_ORDER_SURFACE = 0;
/** Bounding curve in normal mode (depth-tested). */
export const RENDER_ORDER_EDGE = 1;
/** Bounding curve in punch-through (selected / marked) mode. */
export const RENDER_ORDER_EDGE_PUNCH = 2;
/** Vertex / control-point handles — always above edges. */
export const RENDER_ORDER_HANDLE = 3;
