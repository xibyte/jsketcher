/**
 * SurfacingBundle: creates a single SurfacingEditor at activation time.
 * The editor IS the entity context — every entity receives it as `ctx`.
 * Scene loading/saving lives on the editor; primitives merge into the
 * editor's current scene.
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
import {surfacingViewFlags$} from './surfacingViewFlags';

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

  const state$ = surfacingState$;

  // The editor is created once at bundle startup. It owns the workingGroup,
  // sceneSetup, view flags, tool stack, gizmo, and DOM listeners. Entities
  // receive the editor directly as their `ctx`.
  const workingGroup = new ThreeGroup();
  SceneGraph.addToGroup(ctx.services.cadScene.workGroup, workingGroup);
  const editor = new SurfacingEditor(workingGroup, ctx.viewer.sceneSetup, surfacingViewFlags$, ctx);

  /** Push a fresh snapshot so subscribers re-render */
  function notifyChange(): void {
    state$.next({scene: editor.scene, revision: state$.value.revision + 1});
  }

  /** Merge a freshly-built Scene (from a primitive) into the current scene */
  function mergeScene(newScene: Scene) {
    if (!editor.scene) {
      editor.setScene(newScene);
      newScene.syncEntityGraph();
    } else {
      for (const child of [...newScene.children]) {
        editor.scene.addChild(child);
      }
      editor.scene.syncEntityGraph();
      editor.rebuildAll();
      ctx.viewer.requestRender();
    }
    notifyChange();
    scheduleSurfacingSave();
  }

  function addPlane(width = 100, height = 100) {
    mergeScene(createPatchPlane(editor, width, height));
  }

  function addBox(sizeX = 100, sizeY = 100, sizeZ = 100) {
    mergeScene(createPatchBox(editor, sizeX, sizeY, sizeZ));
  }

  function addCylinder(radius = 50, height = 100) {
    mergeScene(createPatchCylinder(editor, radius, height));
  }

  function save(): any {
    if (!editor.scene) return null;
    return {
      scene: editor.scene.serialize(),
      tessResolution: editor.scene.tessResolution,
    };
  }

  function load(data: any): void {
    if (!data) return;
    // Tear down any existing scene.
    if (editor.scene) {
      for (const surface of [...editor.scene.surfaces]) surface.dispose();
      editor.scene = null;
    }
    const sceneData = data.scene || data.cage;
    if (!sceneData) {
      notifyChange();
      return;
    }
    const scene = Scene.deserialize(editor, sceneData);
    scene.tessResolution = data.tessResolution || 8;
    scene.syncEntityGraph();
    editor.setScene(scene);
    notifyChange();
  }

  ctx.surfacingService = {
    get scene() { return editor.scene; },
    get view() { return editor; },
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
