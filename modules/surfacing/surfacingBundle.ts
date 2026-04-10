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

  function ensureModel(): MSurfacingScene {
    if (!currentModel) {
      currentModel = new MSurfacingScene(new PatchCage(), 8);
      pushToModels();
    }
    return currentModel;
  }

  function pushToModels() {
    if (!currentModel) return;
    const models = ctx.craftService.models$.value.filter(
      (m: any) => !(m instanceof MSurfacingScene)
    );
    models.push(currentModel);
    ctx.craftService.models$.next(models);
  }

  function mergeCage(newCage: PatchCage) {
    const model = ensureModel();
    const cage = model.cage;
    const baseIdx = cage.patches.length;

    // Append patches from new cage
    for (const patch of newCage.patches) {
      cage.patches.push(patch);
    }

    // Append groups with shifted indices
    for (const g of newCage.groups) {
      cage.createGroup(g.name, g.patchIndices.map(i => i + baseIdx));
    }

    model.recompute();
    model.refreshSceneEntity();
    pushToModels();
    ctx.projectService.scheduleSave();
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

  // Hook into project save/load
  const origSave = ctx.projectService.save.bind(ctx.projectService);
  const origLoad = ctx.projectService.load.bind(ctx.projectService);

  ctx.projectService.save = function() {
    origSave();
    // Also save surfacing state separately
    const surfacingData = save();
    if (surfacingData) {
      const key = ctx.projectService.projectStorageKey() + '.surfacing';
      ctx.storageService.set(key, JSON.stringify(surfacingData));
    }
  };

  ctx.projectService.load = function() {
    origLoad();
    // Load surfacing state
    try {
      const key = ctx.projectService.projectStorageKey() + '.surfacing';
      const dataStr = ctx.storageService.get(key);
      if (dataStr) {
        load(JSON.parse(dataStr));
      }
    } catch (e) {
      console.error('Failed to load surfacing state:', e);
    }
  };
}

export const BundleName = "@Surfacing";
