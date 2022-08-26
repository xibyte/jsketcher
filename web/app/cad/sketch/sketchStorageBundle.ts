import {ApplicationContext} from "cad/context";
import {ReadSketch} from "./sketchReader";

export function activate(ctx: ApplicationContext) {

  function getAllSketches() {
    const nm = ctx.projectService.sketchStorageNamespace;
    return ctx.storageService.getAllKeysFromNamespace(nm).map(fqn => ({
      fqn, id: fqn.substring(nm.length)
    }));
  }

  function getSketchData(sketchId) {
    const sketchStorageKey = ctx.projectService.sketchStorageKey(sketchId);
    return ctx.storageService.get(sketchStorageKey);
  }

  function setSketchData(sketchId, data) {
    const sketchStorageKey = ctx.projectService.sketchStorageKey(sketchId);
    return ctx.storageService.set(sketchStorageKey, data);
  }

  function removeSketchData(sketchId) {
    const sketchStorageKey = ctx.projectService.sketchStorageKey(sketchId);
    return ctx.storageService.remove(sketchStorageKey);
  }

  function hasSketch(sketchId) {
    const sketchStorageKey = ctx.projectService.sketchStorageKey(sketchId);
    return !!ctx.storageService.get(sketchStorageKey);
  }

  function readSketch(sketchId) {
    const savedSketch = getSketchData(sketchId);
    if (savedSketch === null) {
      return null;
    }

    try {
      return ReadSketch(JSON.parse(savedSketch), sketchId, true);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  ctx.sketchStorageService = {
    getAllSketches, readSketch, hasSketch, getSketchData, setSketchData, removeSketchData
  }
}

export interface SketchStorageService {

  getAllSketches(): {
    id: string,
    fqn: string
  }[];

  getSketchData(sketchId: string): string;

  setSketchData(sketchId: string, data: string): void;

  removeSketchData(sketchId: string): void;

  hasSketch(sketchId: string): boolean;

  readSketch(sketchId: string): any;

}

export interface SketchStorageBundleContext {

  sketchStorageService: SketchStorageService;
}

export const BundleName = "@SketchStorage";

