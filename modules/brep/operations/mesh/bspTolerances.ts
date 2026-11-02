/**
 * Parameterized tolerances for BSP mesh boolean operations.
 * All geometric decisions flow through these values.
 * Exposed in the UI so users can tweak for their specific geometry.
 */
export interface BSPTolerances {
  /** Distance from point to plane to consider coplanar. Default: 1e-5 */
  planeEpsilon: number;

  /** Distance between vertices to snap together. Default: 1e-6 */
  snapEpsilon: number;

  /** Minimum triangle area; below this, triangle is degenerate. Default: 1e-10 */
  areaEpsilon: number;

  /** Max gap for grouping boundary edges into chains. Default: 1e-4 */
  edgeGroupingTolerance: number;
}

export const DEFAULT_BSP_TOLERANCES: BSPTolerances = {
  planeEpsilon: 1e-5,
  snapEpsilon: 1e-6,
  areaEpsilon: 1e-10,
  edgeGroupingTolerance: 1e-4,
};
