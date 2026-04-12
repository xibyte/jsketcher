/**
 * Shared size / scale constants for surfacing visuals.
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
