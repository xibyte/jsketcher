import {Group} from 'three';

/**
 * Runtime context threaded into every surfacing entity at construction.
 *
 * Entities use this to:
 *   - attach their 3D objects to `workingGroup` (the single THREE.Group that
 *     holds every visible piece of the current scene — surface meshes,
 *     CP handles, bounding-curve lines, cage grids, the lot);
 *   - call `requestRender()` after any visual state change so the viewer
 *     redraws on the next animation frame.
 *
 * The context is built by `surfacingBundle` once per live scene and passed
 * into `Scene.deserialize` / primitives / every subsequent entity
 * constructor. Ops read it from the entity they're operating on
 * (`patch.ctx`) so they never need a reference to the Scene.
 *
 * No dedup / registry logic lives here — sharing of BoundingCurves and
 * ControlPoints is the explicit responsibility of whoever constructs
 * adjacent surfaces (deserialize, fill-hole, bridge, etc.).
 */
export interface SurfacingContext {
  /** The THREE.Group every entity adds its 3D objects to. */
  workingGroup: Group;
  /**
   * The viewer's Three.js scene setup — needed by view-layer helpers like
   * ConstantScaleGroup and ScalableLine that peek at camera / container
   * dimensions every frame. Opaque from the surfacing module's point of
   * view; entities just pass it through to those helpers.
   */
  sceneSetup: any;
  /** Request a viewer redraw on the next animation frame. */
  requestRender(): void;
}
