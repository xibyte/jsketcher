/**
 * SelectionGizmoOverlay — a tiny scene-level overlay that reacts to `selection$`.
 *
 * When the current selection is a ControlPointObject3D (anything with a
 * `controlPoint.vertex`), it attaches a TransformControls to follow that
 * vertex. On the gizmo's `change` event it writes back to the vertex via
 * `scene.moveVertex()` so constraint enforcement + surface invalidation
 * cascade for free.
 *
 * No god-object knowledge: the overlay knows only
 *   - the Three.js sceneSetup (needed for TransformControls)
 *   - the Scene entity (for moveVertex)
 *   - the selection$ stream
 *
 * Usage:
 *   const gizmo = new SelectionGizmoOverlay(sceneSetup, scene);
 *   root.add(gizmo.gizmo);       // add the TransformControls to the root
 *   root.add(gizmo.target);      // and the invisible target proxy
 *   // call gizmo.dispose() when tearing down
 */
import {Object3D} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {selection$} from './selection';
import type {Selectable} from './EntityObject3D';

/** Structural type describing anything the overlay will attach to. */
export interface CPSelectable extends Selectable {
  readonly controlPoint: {
    readonly vertex: {
      position: readonly [number, number, number] | number[];
    };
  };
}

function isCPSelectable(s: Selectable | null): s is CPSelectable {
  return !!s && typeof (s as any).controlPoint?.vertex === 'object';
}

export interface SelectionGizmoOptions {
  /** Called on each drag tick AFTER moveVertex runs. Useful for refreshing
   *  scene-level overlays (wireframe/edges/boundaries) and subcage handle
   *  positions that aren't on the Vertex.usedBy chain. */
  onChange?: () => void;
  /** Called once when dragging ends (mouse up). Scene can persist state. */
  onDragEnd?: () => void;
}

export class SelectionGizmoOverlay {

  readonly gizmo: TransformControls;
  readonly target: Object3D = new Object3D();
  private _attached: CPSelectable | null = null;
  private _unsubSelection: () => void = () => {};
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
    // That triggers the Vertex.usedBy → NurbsSurface.invalidateVisual chain
    // automatically. Extra overlay refresh happens via the onChange hook.
    this.gizmo.addEventListener('change', () => {
      if (!this._attached) return;
      const pos = this.target.position;
      const v: any = (this._attached as any).controlPoint.vertex;
      this._scene.moveVertex(v, pos.x, pos.y, pos.z);
      if (this._onChange) this._onChange();
    });

    this._unsubSelection = selection$.attach((sel: Selectable | null) => {
      this._syncToSelection(sel);
    });
  }

  private _syncToSelection(sel: Selectable | null): void {
    if (isCPSelectable(sel)) {
      this._attached = sel;
      const p = sel.controlPoint.vertex.position;
      this.target.position.set(p[0], p[1], p[2]);
      this.gizmo.attach(this.target);
      this.gizmo.visible = true;
      this.gizmo.enabled = true;
    } else {
      this._attached = null;
      this.gizmo.detach();
      this.gizmo.visible = false;
      this.gizmo.enabled = false;
    }
  }

  /** Call when the scene changes, e.g. on reload. */
  setScene(scene: any): void {
    this._scene = scene;
  }

  dispose(): void {
    this._unsubSelection();
    this.gizmo.detach();
    (this.gizmo as any).dispose?.();
  }
}
