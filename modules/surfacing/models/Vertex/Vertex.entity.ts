import type {Vec3} from 'math/vec';
import {Mesh, MeshBasicMaterial} from 'three';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {CurveTessPoint} from '../../tessellation/types';
import type {SurfacingContext} from '../../SurfacingContext';
import {
  sharedSphereGeometry,
  createControlPointMaterial,
  createPickerMaterial,
  select,
  CP_COLOR, CP_HOVER_COLOR, CP_SELECTED_COLOR, CP_MIRROR_COLOR,
  HANDLE_SIZE, CP_VISUAL_SCALE, CP_PICKER_SCALE,
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
 * The Vertex itself is the click target — clicking the picker publishes
 * `this` to `selection$`, which `SelectionGizmoOverlay` picks up and
 * attaches its TransformControls to. On drag the gizmo writes back via
 * `scene.moveVertex(v, x, y, z)` which calls `v.set()`, re-invalidating
 * every usedBy surface.
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
   * adjacent curves/tiles stay topologically coherent at the corner.
   * `xyz` points at `this.position` by reference, so vertex moves are
   * instantly visible in the corner sample with no re-sync.
   */
  cornerTessPoint: CurveTessPoint | null = null;

  // ---- Handle state ----
  private _handle: ConstantScaleGroup | null = null;
  private _handleMaterial: MeshBasicMaterial | null = null;
  private _handlePickerMaterial: MeshBasicMaterial | null = null;
  private _handleSphere: Mesh | null = null;
  private _handlePicker: Mesh | null = null;
  private _visible: boolean = false;
  private _hovered: boolean = false;
  private _selected: boolean = false;
  private _mirrorTarget: boolean = false;

  constructor(ctx: SurfacingContext, x: number, y: number, z: number, id?: string) {
    super(ctx, id ?? generateEntityId('V'));
    this.position = [x, y, z];
  }

  // ---------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------

  set(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    if (this._handle) {
      this._handle.position.set(x, y, z);
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
      if (!this._handle) this._createHandle();
      if (this._handle) this._handle.visible = true;
    } else {
      if (this._handle) this._handle.visible = false;
    }
    this.ctx.requestRender();
  }

  setHovered(hovered: boolean): void {
    if (this._hovered === hovered) return;
    this._hovered = hovered;
    this._applyHandleColor();
    this.ctx.requestRender();
  }

  setSelected(selected: boolean): void {
    if (this._selected === selected) return;
    this._selected = selected;
    this._applyHandleColor();
    if (this._handleSphere) {
      this._handleSphere.scale.setScalar(selected ? CP_PICKER_SCALE : CP_VISUAL_SCALE);
    }
    this.ctx.requestRender();
  }

  setMirrorTarget(mirror: boolean): void {
    if (this._mirrorTarget === mirror) return;
    this._mirrorTarget = mirror;
    this._applyHandleColor();
    this.ctx.requestRender();
  }

  get visible(): boolean { return this._visible; }
  get hovered(): boolean { return this._hovered; }
  get selected(): boolean { return this._selected; }
  get mirrorTarget(): boolean { return this._mirrorTarget; }

  /** True when a click should publish this vertex to `selection$`. */
  isSelectable(): boolean {
    return !this._mirrorTarget;
  }

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------

  dispose(): void {
    this._destroyHandle();
    super.dispose();
  }

  // ---------------------------------------------------------------
  // Handle construction (private)
  // ---------------------------------------------------------------

  private _createHandle(): void {
    const ctx = this.ctx;

    this._handleMaterial = createControlPointMaterial(this._baseColor());
    this._handleSphere = new Mesh(sharedSphereGeometry, this._handleMaterial);
    this._handleSphere.renderOrder = 2;
    this._handleSphere.scale.setScalar(
      this._selected ? CP_PICKER_SCALE : CP_VISUAL_SCALE,
    );

    this._handlePickerMaterial = createPickerMaterial();
    this._handlePicker = new Mesh(sharedSphereGeometry, this._handlePickerMaterial);
    this._handlePicker.renderOrder = 2;
    this._handlePicker.scale.setScalar(CP_PICKER_SCALE);

    const self = this;
    const handle = new ConstantScaleGroup(
      ctx.sceneSetup, HANDLE_SIZE * 2, 1, () => handle.position,
    );
    handle.position.set(this.position[0], this.position[1], this.position[2]);
    handle.add(this._handleSphere);
    handle.add(this._handlePicker);
    (handle as any).userData = {entity: this};
    this._handle = handle;

    // Mouse hooks the app-level raycaster dispatches to.
    (this._handlePicker as any).onMouseEnter = () => self.setHovered(true);
    (this._handlePicker as any).onMouseLeave = () => self.setHovered(false);
    (this._handlePicker as any).onMouseClick = () => {
      if (self.isSelectable()) select(self);
    };

    ctx.workingGroup.add(handle);
  }

  private _destroyHandle(): void {
    if (!this._handle) return;
    this.ctx.workingGroup.remove(this._handle);
    if (this._handleMaterial) this._handleMaterial.dispose();
    if (this._handlePickerMaterial) this._handlePickerMaterial.dispose();
    this._handle = null;
    this._handleMaterial = null;
    this._handlePickerMaterial = null;
    this._handleSphere = null;
    this._handlePicker = null;
  }

  private _baseColor(): number {
    return this._mirrorTarget ? CP_MIRROR_COLOR : CP_COLOR;
  }

  private _applyHandleColor(): void {
    if (!this._handleMaterial) return;
    if (this._selected) {
      this._handleMaterial.color.setHex(CP_SELECTED_COLOR);
    } else if (this._hovered) {
      this._handleMaterial.color.setHex(CP_HOVER_COLOR);
    } else {
      this._handleMaterial.color.setHex(this._baseColor());
    }
  }
}
