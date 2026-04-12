import {Group} from 'three';
import type {StateStream} from 'lstream';
import type {SurfacingViewFlags} from './surfacingViewFlags';
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from './models/BoundingCurve/BoundingCurve.entity';
import type {Vertex} from './models/Vertex/Vertex.entity';

/**
 * Editor-side hooks that the entities call back into to drive dialogs,
 * gizmos, and selection tracking. The surfacing bundle leaves this unset
 * until a `SurfacingEditor` is attached — entities must tolerate missing
 * adapters during load/primitive construction.
 */
export interface SurfacingEditorAdapter {
  /** Entity callbacks when select()/deselect() runs. */
  onSurfaceSelected(surface: NurbsSurface): void;
  onSurfaceDeselected(surface: NurbsSurface): void;
  onBoundingCurveSelected(surface: NurbsSurface, curve: BoundingCurve): void;
  onBoundingCurveDeselected(): void;
  onVertexSelected(vertex: Vertex): void;
  onVertexDeselected(vertex: Vertex): void;
}

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
  /**
   * Reactive view-flags state — entities subscribe to this at construction
   * to react to faces / mesh / edges / boundaries toggles on their own.
   * The StateStream fires the current value on subscribe, so entities get
   * a correct initial paint for free.
   */
  viewFlags$: StateStream<SurfacingViewFlags>;
  /**
   * Editor hooks — set when a SurfacingEditor is attached, cleared on
   * teardown. Entities route dialog / gizmo opening through this so the
   * state stays on the entity and the editor just runs the UI plumbing.
   */
  editor: SurfacingEditorAdapter | null;
}
