import {setSketchPrecision} from './sketch/sketchReader';
import {runSandbox} from './sandbox';
import {LOG_FLAGS} from './logFlags';
import {CoreContext} from "context";
import {SketchFormat_V3} from "../sketcher/io";
import {OperationRequest} from "./craft/craftPlugin";
import {ProjectModel} from "./projectManager/projectManagerPlugin";

export const STORAGE_GLOBAL_PREFIX = 'TCAD';
export const PROJECTS_PREFIX = `${STORAGE_GLOBAL_PREFIX}.projects.`;
export const SKETCH_SUFFIX = '.sketch.';


export function activate(ctx: CoreContext) {

  const [id, hints] = parseHintsFromLocation();

  initProjectService(ctx, id, hints);
}

export function initProjectService(ctx: CoreContext, id: string, hints: any) {

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
    let data = {
      history: ctx.craftService.modifications$.value.history,
      expressions: ctx.expressionService.script$.value,

      // @ts-ignore we deliberately don't uplift the type to the ApplicationContext in order to be able to use ProjectService in the headless mode
      assembly: ctx.assemblyService && ctx.assemblyService.getConstraints()
    };
    ctx.storageService.set(projectStorageKey(), JSON.stringify(data));
  }

  function load() {
    try {
      let dataStr = ctx.storageService.get(ctx.projectService.projectStorageKey());
      if (dataStr) {
        let data = JSON.parse(dataStr);
        loadData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }


  function loadData(data: ProjectModel) {
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

  ctx.projectService = {
    id, sketchStorageKey, projectStorageKey, sketchStorageNamespace, getSketchURL, save, load, loadData, empty,
    hints
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
  let [id, ...paramsArr] = hints.split('&');
  let params = paramsArr.reduce((params, part) => {
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
  })
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

  loadData(data: ProjectModel);

  empty(): void;

}

declare module 'context' {
  interface CoreContext {

    projectService: ProjectService;
  }
}


