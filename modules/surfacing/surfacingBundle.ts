/**
 * SurfacingBundle: holds a single Scene entity and its SurfacingEditor
 * — the interactive controller that owns selection, modes, dialogs,
 * and scene-level overlays. Entity views (surface meshes, CP handles,
 * cages, bounding curves) are self-owned and live directly under
 * `ctx.workingGroup`; the editor holds its own overlaysGroup there
 * for the pieces it draws directly.
 */
import * as SceneGraph from 'scene/sceneGraph';
import {Group as ThreeGroup} from 'three';
import {state, StateStream} from 'lstream';
import {Scene} from './models/Scene/Scene.entity';
import {SurfacingEditor} from './SurfacingEditor';
import {createPatchPlane} from './primitives/plane';
import {createPatchBox} from './primitives/box';
import {createPatchCylinder} from './primitives/cylinder';
import {ViewFlagFacesAction, ViewFlagMeshAction, ViewFlagEdgesAction, ViewFlagBoundariesAction} from './actions/viewFlagActions';
import type {SurfacingContext} from './SurfacingContext';

/** Snapshot of the surfacing state, exposed via a stream so React can subscribe */
export interface SurfacingSnapshot {
  scene: Scene | null;
  /** Bumped on every mutation so listeners notice */
  revision: number;
}

/**
 * Module-level singleton stream so it exists immediately at import time —
 * before the React explorer mounts, before SurfacingBundle.activate() runs.
 * useStream calls in the explorer can subscribe right away without crashing.
 */
export const surfacingState$: StateStream<SurfacingSnapshot> = state({scene: null, revision: 0});

export interface SurfacingService {
  readonly scene: Scene | null;
  readonly view: SurfacingEditor | null;
  /** Reactive snapshot stream — explorer subscribes via useStream */
  state$: StateStream<SurfacingSnapshot>;
  addPlane(width?: number, height?: number): void;
  addBox(sizeX?: number, sizeY?: number, sizeZ?: number): void;
  addCylinder(radius?: number, height?: number): void;
  /** Bump the snapshot stream after an external mutation */
  notifyChange(): void;
  save(): any;
  load(data: any): void;
  scheduleSave(): void;
  flushSave(): void;
}

export function activate(ctx: any) {

  let scene: Scene | null = null;
  let view: SurfacingEditor | null = null;
  const state$ = surfacingState$;

  /**
   * The single runtime context every surfacing entity receives at
   * construction. Entities attach their 3D objects to `workingGroup` and
   * call `requestRender()` after any visual change. Created once, lives
   * for the lifetime of the bundle.
   */
  const workingGroup = new ThreeGroup();
  SceneGraph.addToGroup(ctx.services.cadScene.workGroup, workingGroup);
  const surfacingCtx: SurfacingContext = {
    workingGroup,
    sceneSetup: ctx.viewer.sceneSetup,
    requestRender: () => ctx.viewer.requestRender(),
  };

  /** Push a fresh snapshot so subscribers re-render */
  function notifyChange(): void {
    state$.next({scene, revision: state$.value.revision + 1});
  }

  function ensureView(): void {
    if (!scene || view) return;
    // SurfacingEditor is a plain controller, not a Three.js Group — it
    // parents its own overlay visuals into `ctx.workingGroup` (already
    // attached to cadScene.workGroup above). So we just instantiate.
    view = new SurfacingEditor(scene, ctx);
    ctx.viewer.requestRender();
  }

  function tearDownView(): void {
    if (view) {
      view.dispose();
      view = null;
    }
  }

  /** Merge a freshly-built Scene (from a primitive) into the current scene */
  function mergeScene(newScene: Scene) {
    if (!scene) {
      scene = newScene;
      scene.syncEntityGraph();
      ensureView();
    } else {
      // Move every top-level child of the new scene into the existing one.
      // SurfaceSets are stored on the surface instances themselves —
      // moving the entity preserves its surfaceSet reference automatically.
      // addChild reparents the entity (it leaves newScene's tree).
      for (const child of [...newScene.children]) {
        scene.addChild(child);
      }
      scene.syncEntityGraph();
      if (view) {
        view.rebuildAll();
        ctx.viewer.requestRender();
      }
    }
    notifyChange();
    scheduleSurfacingSave();
  }

  function addPlane(width = 100, height = 100) {
    mergeScene(createPatchPlane(surfacingCtx, width, height));
  }

  function addBox(sizeX = 100, sizeY = 100, sizeZ = 100) {
    mergeScene(createPatchBox(surfacingCtx, sizeX, sizeY, sizeZ));
  }

  function addCylinder(radius = 50, height = 100) {
    mergeScene(createPatchCylinder(surfacingCtx, radius, height));
  }

  function save(): any {
    if (!scene) return null;
    return {
      scene: scene.serialize(),
      tessResolution: scene.tessResolution,
    };
  }

  function load(data: any): void {
    if (!data) return;
    tearDownView();
    // Accept legacy 'cage' field too
    const sceneData = data.scene || data.cage;
    if (!sceneData) {
      scene = null;
      notifyChange();
      return;
    }
    scene = Scene.deserialize(surfacingCtx, sceneData);
    scene.tessResolution = data.tessResolution || 8;
    scene.syncEntityGraph();
    ensureView();
    notifyChange();
  }

  ctx.surfacingService = {
    get scene() { return scene; },
    get view() { return view; },
    state$,
    addPlane,
    addBox,
    addCylinder,
    notifyChange,
    save,
    load,
    scheduleSave: () => scheduleSurfacingSave(),
    flushSave: () => flushSave(),
  } as SurfacingService;

  // Also expose under streams for the useStream(c => c.streams.surfacing.state) pattern
  if (!ctx.streams) ctx.streams = {};
  ctx.streams.surfacing = {state: state$};

  // Register surfacing view flag actions
  if (ctx.actionService) {
    ctx.actionService.registerActions([
      ViewFlagFacesAction,
      ViewFlagMeshAction,
      ViewFlagEdgesAction,
      ViewFlagBoundariesAction,
    ]);
  }

  // ---- Autosave: dedicated debounced save for surfacing state ----
  const AUTOSAVE_DELAY = 2000;
  let autosaveTimer: any = null;

  function surfacingStorageKey(): string {
    return ctx.projectService.projectStorageKey() + '.surfacing';
  }

  function flushSave(): void {
    const surfacingData = save();
    if (surfacingData) {
      ctx.storageService.set(surfacingStorageKey(), JSON.stringify(surfacingData));
    }
  }

  function scheduleSurfacingSave(): void {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      flushSave();
    }, AUTOSAVE_DELAY);
  }

  // Load surfacing state on startup
  try {
    const dataStr = ctx.storageService.get(surfacingStorageKey());
    if (dataStr) {
      load(JSON.parse(dataStr));
    }
  } catch (e) {
    console.error('Failed to load surfacing state:', e);
  }

  // Force-flush any pending autosave when the page is about to unload
  // or becomes hidden. localStorage writes are synchronous, so this is safe.
  function forceFlush(): void {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    try { flushSave(); } catch (e) { console.error('Surfacing flush failed:', e); }
  }
  window.addEventListener('beforeunload', forceFlush);
  window.addEventListener('pagehide', forceFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') forceFlush();
  });
}

export const BundleName = "@Surfacing";
