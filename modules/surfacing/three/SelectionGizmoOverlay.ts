/**
 * SelectionGizmoOverlay — a TransformControls wrapper that can be attached
 * to any entity with a mutable `position: [x,y,z]` and a `set(x, y, z)`
 * method. The editor owns exactly one of these and drives attach/detach
 * imperatively — there's no stream subscription here anymore.
 *
 * Usage:
 *   const gizmo = new SelectionGizmoOverlay(sceneSetup, scene, options);
 *   root.add(gizmo.gizmo);       // add the TransformControls to the root
 *   root.add(gizmo.target);      // and the invisible target proxy
 *
 *   gizmo.attach(vertex);        // call when a vertex is selected
 *   gizmo.detach();              // call when the selection clears
 *   gizmo.dispose();              // when tearing down
 */
import {Object3D} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';

/** Structural type describing anything the overlay will attach to. */
export interface GizmoTarget {
  position: number[];
  set(x: number, y: number, z: number): void;
}

export interface SelectionGizmoOptions {
  onChange?: () => void;
  onDragEnd?: () => void;
}

export class SelectionGizmoOverlay {

  readonly gizmo: TransformControls;
  readonly target: Object3D = new Object3D();
  private _attached: GizmoTarget | null = null;
  private _sceneSetup: any;
  private _scene: any;
  private _onChange: (() => void) | undefined;
  private _onDragEnd: (() => void) | undefined;

  constructor(sceneSetup: any, scene: any, options: SelectionGizmoOptions = {}) {
    this._sceneSetup = sceneSetup;
    this._scene = scene;
    this._onChange = options.onChange;
    this._onDragEnd = options.onDragEnd;
    this.gizmo = new TransformControls(sceneSetup.camera, sceneSetup.renderer.domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    let wasDragging = false;
    this.gizmo.addEventListener('dragging-changed', (e: any) => {
      sceneSetup.trackballControls.enabled = !e.value;
      if (wasDragging && !e.value && this._onDragEnd) this._onDragEnd();
      wasDragging = !!e.value;
    });

    // On each drag tick, push the new target position back into the vertex.
    this.gizmo.addEventListener('change', () => {
      if (!this._attached) return;
      const pos = this.target.position;
      this._scene.moveVertex(this._attached, pos.x, pos.y, pos.z);
      if (this._onChange) this._onChange();
    });
  }

  /** Attach the gizmo to a new target (typically a Vertex). */
  attach(target: GizmoTarget): void {
    this._attached = target;
    const p = target.position;
    this.target.position.set(p[0], p[1], p[2]);
    this.gizmo.attach(this.target);
    this.gizmo.visible = true;
    this.gizmo.enabled = true;
  }

  /** Detach and hide the gizmo. No-op if not attached. */
  detach(): void {
    this._attached = null;
    this.gizmo.detach();
    this.gizmo.visible = false;
    this.gizmo.enabled = false;
  }

  /** Call when the scene changes, e.g. on reload. */
  setScene(scene: any): void {
    this._scene = scene;
  }

  /** Currently attached target, if any. */
  get attached(): GizmoTarget | null {
    return this._attached;
  }

  dispose(): void {
    this.gizmo.detach();
    (this.gizmo as any).dispose?.();
  }
}
