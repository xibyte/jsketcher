/**
 * SurfacingBundle: manages surfacing scene state directly, bypassing the craft pipeline.
 *
 * - Creates surfaces immediately (no wizard/operation flow)
 * - Persists scene state to project storage as 'surfacing' field
 * - Loads scene state on project load
 */
import {MSurfacingScene} from './models/MSurfacingScene';
import {PatchCage} from './models/Scene/Scene.entity';
import {createPatchPlane} from './primitives/plane';
import {createPatchBox} from './primitives/box';
import {createPatchCylinder} from './primitives/cylinder';
import {ViewFlagFacesAction, ViewFlagMeshAction, ViewFlagEdgesAction} from './actions/viewFlagActions';

export interface SurfacingService {
  readonly model: MSurfacingScene;
  addPlane(width?: number, height?: number): void;
  addBox(sizeX?: number, sizeY?: number, sizeZ?: number): void;
  addCylinder(radius?: number, height?: number): void;
  save(): any;
  load(data: any): void;
  refresh(): void;
}

export function activate(ctx: any) {

  let currentModel: MSurfacingScene | null = null;

  function pushToModels() {
    if (!currentModel) return;
    const models = ctx.craftService.models$.value.filter(
      (m: any) => !(m instanceof MSurfacingScene)
    );
    models.push(currentModel);
    ctx.craftService.models$.next(models);
  }

  function mergeCage(newCage: PatchCage) {
    if (!currentModel) {
      // First time: use the populated newCage as the model's scene directly
      currentModel = new MSurfacingScene(newCage, 8);
      pushToModels();
    } else {
      // Subsequent: merge patches/groups into the existing scene
      const cage = currentModel.cage;
      const baseIdx = cage.patches.length;
      for (const patch of newCage.patches) {
        cage.patches.push(patch);
      }
      for (const g of newCage.groups) {
        cage.createGroup(g.name, g.patchIndices.map(i => i + baseIdx));
      }
      currentModel.recompute();
      currentModel.refreshSceneEntity();
      // Trigger view rebuild on the existing SceneObject3D
      const view = (currentModel as any).ext?.view;
      if (view && typeof view.rebuildAll === 'function') {
        view.rebuildAll();
        ctx.viewer.requestRender();
      }
    }
    scheduleSurfacingSave();
  }

  function addPlane(width = 100, height = 100) {
    mergeCage(createPatchPlane(width, height));
  }

  function addBox(sizeX = 100, sizeY = 100, sizeZ = 100) {
    mergeCage(createPatchBox(sizeX, sizeY, sizeZ));
  }

  function addCylinder(radius = 50, height = 100) {
    mergeCage(createPatchCylinder(radius, height));
  }

  function save(): any {
    if (!currentModel) return null;
    return {
      cage: currentModel.serializeCage(),
      tessResolution: currentModel.tessResolution,
    };
  }

  function load(data: any) {
    if (!data || !data.cage) return;
    const cage = PatchCage.deserialize(data.cage);
    currentModel = new MSurfacingScene(cage, data.tessResolution || 8);
    pushToModels();
  }

  function refresh() {
    if (currentModel) {
      currentModel.recompute();
      currentModel.refreshSceneEntity();
      pushToModels();
    }
  }

  ctx.surfacingService = {
    get model() { return currentModel; },
    addPlane,
    addBox,
    addCylinder,
    save,
    load,
    refresh,
  } as SurfacingService;

  // Register surfacing view flag actions
  if (ctx.actionService) {
    ctx.actionService.registerActions([
      ViewFlagFacesAction,
      ViewFlagMeshAction,
      ViewFlagEdgesAction,
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

  // Expose on the service so other code (SceneObject3D, explorer) can trigger it
  (ctx.surfacingService as any).scheduleSave = scheduleSurfacingSave;
  (ctx.surfacingService as any).flushSave = flushSave;

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
