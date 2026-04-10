/**
 * SurfacingBundle: holds a single Scene entity and its SceneObject3D view.
 * No MObject wrapper, no craft pipeline, no viewSyncBundle indirection —
 * the bundle owns the lifecycle directly.
 */
import * as SceneGraph from 'scene/sceneGraph';
import {Scene} from './models/Scene/Scene.entity';
import {SceneObject3D} from './models/Scene/Scene.object3d';
import {createPatchPlane} from './primitives/plane';
import {createPatchBox} from './primitives/box';
import {createPatchCylinder} from './primitives/cylinder';
import {ViewFlagFacesAction, ViewFlagMeshAction, ViewFlagEdgesAction, ViewFlagBoundariesAction} from './actions/viewFlagActions';

export interface SurfacingService {
  readonly scene: Scene | null;
  readonly view: SceneObject3D | null;
  addPlane(width?: number, height?: number): void;
  addBox(sizeX?: number, sizeY?: number, sizeZ?: number): void;
  addCylinder(radius?: number, height?: number): void;
  save(): any;
  load(data: any): void;
  scheduleSave(): void;
  flushSave(): void;
}

export function activate(ctx: any) {

  let scene: Scene | null = null;
  let view: SceneObject3D | null = null;

  function ensureView(): void {
    if (!scene || view) return;
    view = new SceneObject3D(scene, ctx);
    SceneGraph.addToGroup(ctx.services.cadScene.workGroup, view);
    ctx.viewer.requestRender();
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
      const baseIdx = scene.surfaces.length;
      for (const surface of newScene.surfaces) {
        scene.surfaces.push(surface);
      }
      for (const g of newScene.groups) {
        scene.createGroup(g.name, g.patchIndices.map(i => i + baseIdx));
      }
      scene.syncEntityGraph();
      if (view) {
        view.rebuildAll();
        ctx.viewer.requestRender();
      }
    }
    // Notify the explorer panel that the scene tree has changed
    document.dispatchEvent(new CustomEvent('patch-cage-constraints-changed'));
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
    // Tear down any existing view
    if (view) {
      SceneGraph.removeFromGroup(ctx.services.cadScene.workGroup, view);
      view.dispose();
      view = null;
    }
    // Accept legacy 'cage' field too
    const sceneData = data.scene || data.cage;
    if (!sceneData) return;
    scene = Scene.deserialize(sceneData);
    scene.tessResolution = data.tessResolution || 8;
    scene.syncEntityGraph();
    ensureView();
    document.dispatchEvent(new CustomEvent('patch-cage-constraints-changed'));
  }

  ctx.surfacingService = {
    get scene() { return scene; },
    get view() { return view; },
    addPlane,
    addBox,
    addCylinder,
    save,
    load,
    scheduleSave: () => scheduleSurfacingSave(),
    flushSave: () => flushSave(),
  } as SurfacingService;

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
}

export const BundleName = "@Surfacing";
