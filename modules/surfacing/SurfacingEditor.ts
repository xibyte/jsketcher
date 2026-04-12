// @ts-nocheck
import {SURFACING_SCENE} from 'cad/model/entities';
import {setAttribute} from 'scene/objectData';
import {Group} from 'three';
import type SceneSetUp from 'scene/sceneSetup';
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';
import {Scene} from './models/Scene/Scene.entity';
import {surfacingViewFlags$, type SurfacingViewFlags} from './surfacingViewFlags';
import type {StateStream} from 'lstream';
import type {Tool} from './tool';
import {DefaultTool} from './tools/defaultTool';
import {RaycastService} from './RaycastService';
import {InputAdapter} from './InputAdapter';

/**
 * SurfacingEditor — tool host and service layer for one Scene.
 *
 * Owns: a tool stack, the shared gizmo, DOM event dispatching, dialog
 * plumbing, raycast helpers, and the overlays Group. ALL per-mode state
 * (hover, selection, bridge picks, fill-hole loops) lives on the active
 * Tool, never on the editor itself.
 *
 * Implements SurfacingContext so entities can reference `this` as their
 * `ctx` without importing the full editor class.
 */
export class SurfacingEditor {

  scene: Scene;
  readonly workingGroup: Group;
  readonly sceneSetup: SceneSetUp;
  readonly viewFlags$: StateStream<SurfacingViewFlags>;
  readonly ctx: any;
  readonly raycast!: RaycastService;
  resolution: number = 8;
  surfaceMeshes: any[] = [];

  private disposers: (() => void)[] = [];
  private tools: Tool[] = [];
  private readonly inputAdapter: InputAdapter;

  get currentTool(): Tool { return this.tools[this.tools.length - 1]; }

  constructor(workingGroup: Group, sceneSetup: any, viewFlags$: any, ctx: any) {
    this.ctx = ctx;
    this.workingGroup = workingGroup;
    this.sceneSetup = sceneSetup;
    this.viewFlags$ = viewFlags$;

    this.scene = new Scene(this);
    setAttribute(this.workingGroup, SURFACING_SCENE, this);
    (this as any).raycast = new RaycastService(this);
    this.inputAdapter = new InputAdapter(this);

    this.disposers.push(surfacingViewFlags$.attach(() => {
      ctx.viewer.requestRender();
    }));

    // Push the default tool as the bottom of the stack.
    this.pushTool(new DefaultTool());
  }

  requestRender(): void {
    this.ctx.viewer.requestRender();
  }

  /**
   * Replace the current scene with a new one (e.g. from deserialization).
   * Disposes the old scene's entities and re-inits the current tool.
   */
  loadScene(scene: Scene): void {
    for (const surface of [...this.scene.surfaces]) surface.dispose();
    this.scene = scene;
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);
    this.currentTool.init(this);
  }

  // ---- Tool stack ----

  pushTool(tool: Tool): void {
    // If the same tool type is already active, toggle it off.
    if (this.tools.length > 1 && this.currentTool.constructor === tool.constructor) {
      this.popTool();
      return;
    }
    if (this.tools.length > 0) this.currentTool.cleanup();
    tool.init(this);
    this.tools.push(tool);
  }

  popTool(): void {
    if (this.tools.length <= 1) throw new Error('Cannot pop the default tool');
    this.currentTool.cleanup();
    this.tools.pop();
    this.currentTool.init(this);
  }

  /** Backward-compat getter that reads from the DefaultTool's state. */
  get selectedPatchIdx(): number {
    const dt = this.tools[0] as any;
    const sel = dt?.selectedSurface;
    return sel ? this.scene.surfaces.indexOf(sel) : -1;
  }

  /** Current selection — read from the DefaultTool at the bottom of the stack. */
  get selection(): NurbsSurface | null {
    const dt = this.tools[0] as any;
    return dt?.selectedSurface ?? null;
  }

  // ---- Entity view bookkeeping ----------------------------------------

  /**
   * After a structural op (split / subdivide / fill …) the scene's
   * surface list may have changed. Refresh external references
   * (surfaceMeshes index, click handlers) and propagate mirror-target
   * colouring; no actual view construction happens here anymore —
   * entity constructors did that already.
   */
  refreshEntityRefs() {
    const scene = this.scene;
    if (!scene) return;
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);
    for (const surface of scene.surfaces) {
      for (const row of surface.grid) {
        for (const cp of row) cp.setMirrorTarget(scene.isMirrorTarget(cp));
      }
    }
  }

  /**
   * Refresh the scene-level overlays that aren't yet owned by individual
   * entities (wireframe UV grid, edges, boundaries) and update subcage
   * handle positions after a drag.
   *
   * Per-surface retessellation is NOT done here — Vertex.set() already
   * notifies every dependent NurbsSurface via the usedBy back-reference,
   * and each surface calls its own object3d.rebuild(). This method just
   * keeps the scene-level decorations in sync.
   */
  refreshOverlaysForDrag(): void {
    if (!this.scene) return;

    const patch = this.selection;
    if (patch) {
      const cageView: any = patch.cage?.object3d;
      if (cageView && typeof cageView.sync === 'function') cageView.sync();
      // Refresh the 4 bounding curves so their lines track the new geometry.
      patch.boundingCurves.bottom.refreshGeometry();
      patch.boundingCurves.right.refreshGeometry();
      patch.boundingCurves.top.refreshGeometry();
      patch.boundingCurves.left.refreshGeometry();
    }

    this.ctx.viewer.requestRender();
  }

  // ---- Rebuild ----

  rebuildAll() {
    this.currentTool.cleanup();
    this.refreshEntityRefs();
    this.scene.syncEntityGraph();
    this.currentTool.init(this);
    this.ctx.surfacingService.scheduleSave();
    this.ctx.surfacingService.notifyChange();
    this.ctx.viewer.requestRender();
  }

  // ---- Utilities ----

  clearGroup(group) {
    while (group.children.length > 0) {
      const c = group.children[0];
      group.remove(c);
      c.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) ch.material.dispose(); });
    }
  }

  dispose() {
    // Clean up the tool stack top-down.
    while (this.tools.length > 0) {
      this.tools.pop()!.cleanup();
    }

    this.inputAdapter.dispose();
    for (const surface of [...this.scene.surfaces]) surface.dispose();
    for (const d of this.disposers) {
      try { d(); } catch (e) { /* ignore */ }
    }
    this.disposers = [];
  }
}

