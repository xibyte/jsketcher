/**
 * SurfacingBundle: holds a single Scene entity and its SceneObject3D view.
 * No MObject wrapper, no craft pipeline, no viewSyncBundle indirection —
 * the bundle owns the lifecycle directly.
 */
import * as SceneGraph from 'scene/sceneGraph';
import {state, StateStream} from 'lstream';
import {Scene} from './models/Scene/Scene.entity';
import {SceneObject3D} from './models/Scene/Scene.object3d';
import {createPatchPlane} from './primitives/plane';
import {createPatchBox} from './primitives/box';
import {createPatchCylinder} from './primitives/cylinder';
import {ViewFlagFacesAction, ViewFlagMeshAction, ViewFlagEdgesAction, ViewFlagBoundariesAction} from './actions/viewFlagActions';

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
  readonly view: SceneObject3D | null;
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
  let view: SceneObject3D | null = null;
  const state$ = surfacingState$;

  /** Push a fresh snapshot so subscribers re-render */
  function notifyChange(): void {
    state$.next({scene, revision: state$.value.revision + 1});
  }

  function ensureView(): void {
    if (!scene || view) return;
    view = new SceneObject3D(scene, ctx);
    SceneGraph.addToGroup(ctx.services.cadScene.workGroup, view);
    ctx.viewer.requestRender();
  }

  function tearDownView(): void {
    if (view) {
      SceneGraph.removeFromGroup(ctx.services.cadScene.workGroup, view);
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
      // Append surfaces and groups from the new scene into the existing one.
      // SurfaceSets are stored on the surface instances themselves —
      // pushing the surface preserves its surfaceSet reference automatically.
      // Group entities hold direct surface refs, so they can be moved over
      // verbatim with no index remapping.
      for (const surface of newScene.surfaces) scene.surfaces.push(surface);
      for (const g of newScene.groups) scene.groups.push(g);
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
    mergeScene(createPatchPlane(width, height));
  }

  function addBox(sizeX = 100, sizeY = 100, sizeZ = 100) {
    mergeScene(createPatchBox(sizeX, sizeY, sizeZ));
  }

  function addCylinder(radius = 50, height = 100) {
    mergeScene(createPatchCylinder(radius, height));
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
    scene = Scene.deserialize(sceneData);
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
