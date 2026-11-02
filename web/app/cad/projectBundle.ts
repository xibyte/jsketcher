import {setSketchPrecision} from './sketch/sketchReader';
import {runSandbox} from './sandbox';
import {LOG_FLAGS} from './logFlags';
import {ApplicationContext} from "cad/context";
import {ProjectCounters, ProjectModel} from "./projectManager/projectManagerBundle";
import {DebugMode$} from "debugger/Debugger";
import {fillUpMissingFields} from "cad/craft/schema/initializeBySchema";

export const STORAGE_GLOBAL_PREFIX = 'TCAD';
export const PROJECTS_PREFIX = `${STORAGE_GLOBAL_PREFIX}.projects.`;
export const SKETCH_SUFFIX = '.sketch.';


export function activate(ctx: ApplicationContext) {

  const [id, hints] = parseHintsFromLocation();

  initProjectService(ctx, id, hints);
}

export function initProjectService(ctx: ApplicationContext, id: string, hints: any) {

  processParams(hints, ctx);

  const sketchNamespace = id + SKETCH_SUFFIX;
  const sketchStorageNamespace = PROJECTS_PREFIX + sketchNamespace;

  function sketchStorageKey(sketchIdId) {
    return sketchStorageNamespace + sketchIdId;
  }

  function projectStorageKey() {
    return PROJECTS_PREFIX + id;
  }

  function getSketchURL(sketchId) {
    return sketchNamespace + sketchId;
  }

  function save() {
    const data: ProjectModel = {
      history: ctx.craftService.modifications$.value.history,
      expressions: ctx.expressionService.script$.value,

      // @ts-ignore we deliberately don't uplift the type to the ApplicationContext in order to be able to use ProjectService in the headless mode
      assembly: ctx.assemblyService && ctx.assemblyService.getConstraints()
    };

    const currentWorkbench = ctx.workbenchService.currentWorkbench$.value;

    if (!currentWorkbench?.internal && ctx.workbenchService.defaultWorkbenchId !== currentWorkbench.workbenchId) {
      data.workbench = currentWorkbench.workbenchId;
    }
    data.counters = counterGenerator.projectCounters;
    ctx.storageService.set(projectStorageKey(), JSON.stringify(data));
  }

  function load() {
    try {
      if (ctx.storageService.get(ctx.projectService.projectStorageKey())) loadStrict();
    } catch (e) {
      console.error(e);
    }
  }

  // A host-driven restore needs to receive load errors rather than silently
  // treating a caught exception as a successfully reconstructed project.
  function loadStrict() {
    const dataStr = ctx.storageService.get(ctx.projectService.projectStorageKey());
    if (!dataStr) throw new Error('Project data is unavailable.');
    const data = JSON.parse(dataStr);
    loadData(data);
    loadWorkbench(data);
  }

  function upgradeIfNeeded(data: ProjectModel) {
    const history = data.history || [];
    const existing = history.map(req => Number(req.params && req.params.featureId))
      .filter(id => Number.isSafeInteger(id) && id > 0);
    const persisted = Number(data.counters && data.counters.featureId);
    counterGenerator.projectCounters = {featureId: Math.max(0, ...existing, Number.isSafeInteger(persisted) ? persisted : 0)};
    for (const req of history) {
      const operation = ctx.operationService.get(req.type);
      if (operation) {
        fillUpMissingFields(req.params, operation.schema, ctx);
        if (!req.params.featureId) req.params.featureId = counterGenerator.generateFeatureId();
      }
    }
    data.counters = counterGenerator.projectCounters;
  }

  function loadWorkbench(data: ProjectModel) {
    if (data.workbench) {
      ctx.workbenchService.switchWorkbench(data.workbench, true);
    }
  }

  function loadData(data: ProjectModel) {
    upgradeIfNeeded(data);
    if (data.expressions) {
      ctx.expressionService.load(data.expressions);
    }
    if (data.history) {
      ctx.craftService.reset(data.history);
    }

    // @ts-ignore we deliberately don't uplift the type to the ApplicationContext in order to be able to use ProjectService in the headless mode
    if (data.assembly && ctx.assemblyService) {
      // @ts-ignore
      ctx.assemblyService.loadConstraints(data.assembly);
    }

  }

  function empty() {
    loadData({
      history: [],
      expressions: ""
    });
  }

  const counterGenerator = new ProjectCounterGenerator(new ProjectCounters());

  ctx.projectService = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL, save, load, loadStrict, loadData, empty,
    hints, counterGenerator
  };

}

function parseHintsFromLocation() {
  let hints = window.location.hash.substring(1);
  if (!hints) {
    hints = window.location.search.substring(1);
  }
  if (!hints) {
    hints = "DEFAULT";
  }
  return parseHints(hints);
}

function parseHints(hints) {
  const [id, ...paramsArr] = hints.split('&');
  const params = paramsArr.reduce((params, part) => {
    let [key, value] = part.split('=');
    if (key) {
      if (!value) {
        value = true;
      }
      params[key] = value;
    }
    return params;
  }, {});
  return [id, params];
}

function processParams(params, context) {
  if (params.sketchPrecision) {
    setSketchPrecision(parseInt(params.sketchPrecision));
  }  
  if (params.sandbox) {
    setTimeout(() => runSandbox(context));
  }
  
  const LOG_FLAGS_PREFIX = "LOG.";
  Object.keys(params).forEach(key => {
    if (key.startsWith(LOG_FLAGS_PREFIX)) {
      LOG_FLAGS[key.substring(LOG_FLAGS_PREFIX.length)] = true
    }
  });

  if (params.debug) {
    DebugMode$.next(true);
  }
}

export class ProjectCounterGenerator {

  projectCounters: ProjectCounters;

  constructor(projectCounters) {
    this.projectCounters = projectCounters;
  }

  generateFeatureId(): string {
    return (++this.projectCounters.featureId) + "";
  }
}

export interface ProjectService {

  readonly id: string;

  readonly sketchStorageNamespace: string;

  hints: any;

  sketchStorageKey(sketchId: string): string;

  projectStorageKey(): string

  getSketchURL(sketchId: string): string

  save(): void;

  load(): void

  loadStrict(): void;

  loadData(data: ProjectModel);

  empty(): void;

  counterGenerator: ProjectCounterGenerator;
}

export interface ProjectBundleContext {

  projectService: ProjectService;

}

export const BundleName = "@Project";

