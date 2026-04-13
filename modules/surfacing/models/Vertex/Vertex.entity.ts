import type {Vec3} from 'math/vec';
import {Mesh, MeshBasicMaterial} from 'three';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import {GeometricEntity} from '../GeometricEntity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {CurveTessPoint} from '../../tessellation/types';
import type {SurfacingEditor} from '../../SurfacingEditor';
import {
  sharedSphereGeometry,
  createControlPointMaterial,
  createPickerMaterial,
  SelectionGizmoOverlay,
  CP_COLOR, CP_HOVER_COLOR, CP_SELECTED_COLOR, CP_MIRROR_COLOR,
  HANDLE_SIZE, CP_VISUAL_SCALE, CP_HOVER_SCALE, CP_PICKER_SCALE,
} from '../../three';

/**
 * A 3D point in the scene. Shared by identity across NurbsSurfaces for
 * watertight topology — moving a Vertex notifies every dependent surface
 * via `usedBy` so each one invalidates its own visual.
 *
 * Every Vertex owns a **lazy draggable handle**: a small visible sphere +
 * an invisible picker sphere wrapped in a ConstantScaleGroup that keeps
 * the handle at constant screen size. The handle is created the first
 * time `setVisible(true)` is called, reused on subsequent toggles, and
 * destroyed by `dispose()`. A Vertex that nobody shows never allocates
 * any Three.js objects.
 *
 * The Vertex itself is the click target — clicking the picker calls
 * `this.select()` which routes through the editor adapter to attach the
 * shared TransformControls gizmo. On drag the gizmo writes back via
 * `v.set(x, y, z)`, re-invalidating every usedBy surface. For
 * ControlPoints, `set()` also fans out through
 * `Scene.notifyControlPointLocationChange` so subscribed constraints
 * (arc, mirror, …) can react.
 *
 * Plain `Vertex` has no weight. NURBS cage points use `ControlPoint
 * extends Vertex` which adds a scalar weight.
 */
export class Vertex extends GeometricEntity {

  position: Vec3;
  /** Back-references to surfaces that include this vertex in their 4×4 grid. */
  readonly usedBy: Set<NurbsSurface> = new Set();
  /**
   * When this Vertex is the end of one or more BoundingCurves, the curves
   * all share this single CurveTessPoint as their endpoint sample, so
   * adjacent curves/triangles stay topologically coherent at the corner.
   * `xyz` points at `this.position` by reference, so vertex moves are
   * instantly visible in the corner sample with no re-sync.
   */
  cornerTessPoint: CurveTessPoint | null = null;

  // ---- Handle state ----
  private handle: ConstantScaleGroup | null = null;
  private handleMaterial: MeshBasicMaterial | null = null;
  private handlePickerMaterial: MeshBasicMaterial | null = null;
  private handleSphere: Mesh | null = null;
  private handlePicker: Mesh | null = null;
  private _visible: boolean = false;
  private _mirrorTarget: boolean = false;

  constructor(ctx: SurfacingEditor, x: number, y: number, z: number, id?: string) {
    super(ctx, id ?? ctx.nextId('V'));
    this.position = [x, y, z];
  }

  // ---------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------

  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    if (this.handle) {
      this.handle.position.set(x, y, z);
    }
    // Notify every dependent surface — they schedule their own visual rebuild.
    for (const surface of this.usedBy) surface.invalidateVisual();
  }

  // ---------------------------------------------------------------
  // Refcounting — `usedBy` tracks the surfaces that reference this
  // vertex in their grid. When the last one is removed the vertex
  // self-disposes (drops its handle, clears the cornerTessPoint).
  // ---------------------------------------------------------------

  addUser(surface: NurbsSurface): void {
    this.usedBy.add(surface);
  }

  removeUser(surface: NurbsSurface): void {
    this.usedBy.delete(surface);
    if (this.usedBy.size === 0) this.dispose();
  }

  // ---------------------------------------------------------------
  // Visual state API (intrinsic to the Vertex)
  // ---------------------------------------------------------------

  /**
   * Show or hide the handle. First call with `true` creates the Three.js
   * primitives and parents them to `ctx.workingGroup`; subsequent calls
   * toggle the Group's visibility. `false` keeps the handle allocated but
   * hidden — disposal happens via `dispose()`.
   */
  setVisible(visible: boolean): void {
    if (this._visible === visible) return;
    this._visible = visible;
    if (visible) {
      if (!this.handle) this.createHandle();
      if (this.handle) this.handle.visible = true;
    } else {
      if (this.handle) this.handle.visible = false;
    }
    this.ctx.requestRender();
  }

  /** Paint the handle with a specific color and scale. Tool-driven. */
  mark(color: number, scale: number = CP_HOVER_SCALE): void {
    if (this.handleMaterial) this.handleMaterial.color.setHex(color);
    if (this.handleSphere) this.handleSphere.scale.setScalar(scale);
    this.ctx.requestRender();
  }

  /** Reset the handle to its base color and default scale. */
  unmark(): void {
    if (this.handleMaterial) this.handleMaterial.color.setHex(this.baseColor());
    if (this.handleSphere) this.handleSphere.scale.setScalar(CP_VISUAL_SCALE);
    this.ctx.requestRender();
  }

  private gizmoRef: SelectionGizmoOverlay | null = null;

  /** Enter edit mode: mark selected, attach to gizmo. */
  enterEditMode(gizmo: SelectionGizmoOverlay): void {
    this.mark(CP_SELECTED_COLOR, CP_PICKER_SCALE);
    gizmo.attach(this);
    this.gizmoRef = gizmo;
  }

  /** Exit edit mode: unmark, detach from gizmo. */
  exitEditMode(): void {
    this.unmark();
    if (this.gizmoRef) {
      this.gizmoRef.detach();
      this.gizmoRef = null;
    }
  }

  setMirrorTarget(mirror: boolean): void {
    if (this._mirrorTarget === mirror) return;
    this._mirrorTarget = mirror;
    this.unmark();
  }

  get visible(): boolean { return this._visible; }
  get mirrorTarget(): boolean { return this._mirrorTarget; }

  isSelectable(): boolean {
    return !this._mirrorTarget;
  }

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------

  dispose(): void {
    if (this.gizmoRef) {
      this.gizmoRef.detach();
      this.gizmoRef = null;
    }
    this.destroyHandle();
    super.dispose();
  }

  // ---------------------------------------------------------------
  // Handle construction (private)
  // ---------------------------------------------------------------

  private createHandle(): void {
    const ctx = this.ctx;

    this.handleMaterial = createControlPointMaterial(this.baseColor());
    this.handleSphere = new Mesh(sharedSphereGeometry, this.handleMaterial);
    this.handleSphere.renderOrder = 2;
    this.handleSphere.scale.setScalar(CP_VISUAL_SCALE);

    this.handlePickerMaterial = createPickerMaterial();
    this.handlePicker = new Mesh(sharedSphereGeometry, this.handlePickerMaterial);
    this.handlePicker.renderOrder = 2;
    this.handlePicker.scale.setScalar(CP_PICKER_SCALE);

    const handle = new ConstantScaleGroup(
      ctx.sceneSetup, HANDLE_SIZE * 2, 1, () => handle.position,
    );
    handle.position.set(this.position[0], this.position[1], this.position[2]);
    handle.add(this.handleSphere);
    handle.add(this.handlePicker);
    (handle as any).userData = {entity: this};
    this.handle = handle;

    ctx.workingGroup.add(handle);
  }

  private destroyHandle(): void {
    if (!this.handle) return;
    this.ctx.workingGroup.remove(this.handle);
    if (this.handleMaterial) this.handleMaterial.dispose();
    if (this.handlePickerMaterial) this.handlePickerMaterial.dispose();
    this.handle = null;
    this.handleMaterial = null;
    this.handlePickerMaterial = null;
    this.handleSphere = null;
    this.handlePicker = null;
  }

  private baseColor(): number {
    return this._mirrorTarget ? CP_MIRROR_COLOR : CP_COLOR;
  }

}
